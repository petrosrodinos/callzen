import { Injectable } from '@nestjs/common';
import { PlanKey } from 'generated/prisma';
import { AppConfigService } from '@/modules/app-config/app-config.service';
import {
  ANALYSIS_FEATURE_FIELDS,
  ANALYSIS_FEATURE_KEYS,
  AnalysisFeature,
} from '@/shared/config/plans/analysis-visibility.config';
import { EntitlementsService } from './entitlements.service';

export interface AnalysisTeasers {
  moments?: { mistakes: number; strengths: number };
  improvements?: number;
  next_steps?: number;
  suggested_practice?: number;
  category_scores?: number;
}

export interface VisibilityResult<T> {
  analysis: Partial<T> & {
    locked_features: AnalysisFeature[];
    teasers: AnalysisTeasers;
  };
}

const count = (value: unknown): number => (Array.isArray(value) ? value.length : 0);

// The full analysis is always computed and stored; this filters what is served, per the plan of the
// organisation that owns the call (§9). Locked fields never leave the API — only counts, for teasers.
@Injectable()
export class AnalysisVisibilityService {
  constructor(
    private readonly appConfig: AppConfigService,
    private readonly entitlements: EntitlementsService,
  ) {}

  visibleFeatures(plan: PlanKey): Record<AnalysisFeature, boolean> {
    return this.appConfig.get('analysis.visibility')[plan];
  }

  async visibleFeaturesFor(organisationId: string) {
    const { plan } = await this.entitlements.getEntitlements(organisationId);
    return this.visibleFeatures(plan);
  }

  async isVisible(organisationId: string, feature: AnalysisFeature) {
    return (await this.visibleFeaturesFor(organisationId))[feature];
  }

  // Platform admins bypass the filter, for support.
  filter<T extends Record<string, unknown>>(
    analysis: T,
    visible: Record<AnalysisFeature, boolean>,
    options: { bypass?: boolean } = {},
  ): VisibilityResult<T>['analysis'] {
    if (options.bypass) return { ...analysis, locked_features: [], teasers: {} };
    const locked = ANALYSIS_FEATURE_KEYS.filter((feature) => !visible[feature]);
    const result: Record<string, unknown> = { ...analysis };
    const teasers: AnalysisTeasers = {};

    for (const feature of locked) {
      for (const field of ANALYSIS_FEATURE_FIELDS[feature]) delete result[field];
      switch (feature) {
        case 'moments':
          teasers.moments = {
            mistakes: count(analysis.mistakes),
            strengths: count(analysis.strengths),
          };
          break;
        case 'improvements':
          teasers.improvements = count(analysis.improvements);
          break;
        case 'next_steps':
          teasers.next_steps = count(analysis.next_steps);
          break;
        case 'suggested_practice':
          teasers.suggested_practice = count(analysis.suggested_practice);
          break;
        case 'category_scores':
          teasers.category_scores = count(analysis.category_scores);
          break;
      }
    }
    return {
      ...(result as Partial<T>),
      locked_features: locked,
      teasers,
    };
  }
}
