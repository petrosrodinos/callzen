# CallZen: Product Specification

## 0. Purpose of This Document

This document describes **what** the product should do and **why**. It does not cover **how** to build it. It sets out the product vision, the target users, the core concepts, the features, the expected behavior, and the open questions. Engineering, design and architecture decisions belong in separate documents.

---

## 1. Product Overview

### 1.1 Vision

CallZen is an AI-powered sales companion that helps salespeople perform better on live calls and get better between calls. It has two main capabilities that work together:

1. **Real-Time Call Assistance**: an AI "co-pilot" that listens to live sales conversations (online meetings or phone calls on speaker or via microphone) and suggests what to say next in real time. After each call, it delivers a detailed performance review.
2. **Sales Practice Agents**: AI-powered voice "prospects" that the user can talk to, in order to rehearse cold calls, discovery calls, objection handling and closing in a safe, repeatable environment.

When the two are combined, the user can rehearse against a realistic AI prospect while the same co-pilot they use on real calls coaches them live. This makes practice as close as possible to the real thing.

### 1.2 Problem Statement

- Salespeople, especially new ones or those doing cold outreach, often freeze, lose track of the script, miss buying signals or handle objections poorly during live calls.
- Feedback on real calls is rare and inconsistent. It usually depends on a manager having time to listen to recordings.
- Practicing sales conversations usually requires another person (a manager or colleague) to role-play, which is awkward, hard to schedule and not realistic enough.
- Scripts and playbooks exist, but they are hard to follow dynamically while a conversation is happening.

### 1.3 Goals

- Help users say the right thing at the right moment during live calls.
- Give users objective, consistent and actionable feedback after every call.
- Let users practice any sales scenario on demand, at any difficulty, as often as they want.
- Let users tailor the AI's behavior to their product, their market, their scripts and their personal style.
- Help users improve measurably over time.

### 1.4 Non-Goals (Current Phase)

- Visual or video avatars for practice agents. These are explicitly out of scope for now.
- The AI speaking on the user's behalf in real calls. In live calls the AI only *suggests*, and the human always speaks.
- A full CRM, dialer or calendar system. CallZen may integrate with these in the future but does not replace them.
- Automated outbound calling.

---

## 2. Target Users and Personas

| Persona | Description | Primary Needs |
|---|---|---|
| **Cold Caller / SDR / BDR** | Makes high volumes of first-touch calls to prospects who don't know them. | Strong openers, fast objection handling, staying on script under pressure, lots of practice. |
| **Account Executive / Closer** | Runs discovery, demo and closing calls, mostly over online meetings. | Discovery question prompts, handling complex objections, spotting buying signals, post-call analysis. |
| **Freelancer / Founder / Solo Seller** | Sells their own product or service without a sales team or coach. | A "virtual sales coach", confidence building, structured feedback. |
| **Sales Manager / Trainer** (future-facing) | Coaches a team and wants to scale training. | Creating standardized practice scenarios, reviewing team performance. |
| **Career Changer / Sales Trainee** | New to sales, learning fundamentals. | Safe practice environment, easy scenarios that ramp up in difficulty. |

The initial primary user is an **individual salesperson** using the product for themselves.

---

## 3. Key Concepts and Definitions

| Term | Definition |
|---|---|
| **Call** | Any sales conversation captured by CallZen. A call can be a *Live Call* or a *Practice Session*. |
| **Live Call** | A real conversation between the user and a real human prospect. It is captured either from an online meeting platform or through the device microphone. |
| **Online Meeting Call** | A Live Call that happens on a web meeting platform such as Google Meet, Zoom, Microsoft Teams or similar. |
| **External / Microphone Call** | A Live Call that happens outside a meeting platform (for example a phone call on speaker or a call from another device), captured through the computer's microphone. This is mainly used for cold calls. |
| **Practice Session** | A simulated conversation between the user and an AI Practice Agent playing the role of a prospect. |
| **Assistant Agent (Co-pilot)** | A user-configured AI agent that listens to a call and gives real-time text suggestions to the user. Each one has its own name, purpose, script, instructions and settings. |
| **Practice Agent (AI Prospect)** | A user-configured AI voice agent that simulates a customer, prospect or lead in a Practice Session. |
| **Script** | A structured or semi-structured sales script (openers, pitch, questions, objection responses, closing lines) that the user gives to an Assistant Agent. |
| **Instructions** | Free-form guidance that shapes how an agent behaves (for example "be concise", "always push for a meeting booking", "never mention pricing first"). |
| **Knowledge / Context** | Supporting information an agent can use, such as product details, pricing, FAQs, competitor info, case studies and ideal customer profile. |
| **Suggestion** | A short piece of real-time text guidance shown to the user during a call, such as a next line to say, a question to ask, an objection response or a reminder. |
| **Transcript** | The text record of everything said during a call, labeled by speaker. |
| **Recording** | The stored audio of a call. |
| **Call Analysis (Post-Call Report)** | The AI-generated evaluation produced after a call ends. It includes a score, mistakes, strengths, areas for improvement and other feedback. |
| **Score** | A numeric rating of the user's performance on a call, with an overall score and category sub-scores. |
| **Lead Temperature** | How familiar and receptive a prospect is at the start of the conversation. A **Cold** lead has had no prior contact or interest. A **Warm** lead has shown some interest or has prior contact. (**Hot** may be added later.) |
| **Difficulty Level** | How hard the AI prospect is to persuade, engage or convert. |
| **Scenario** | The situation that frames a Practice Session: who the prospect is, what they need, the context of the call and what the user is trying to achieve. |
| **AI Model** | The underlying AI "brain" that powers an agent. Users can pick from available models. CallZen recommends a default. |
| **Voice Provider** | The service that powers a Practice Agent's real-time voice. Users can pick between several. |
| **Integrated Practice Mode** | A Practice Session in which an Assistant Agent is also active, giving the user live suggestions exactly as it would on a real call. |

---

## 4. Feature 1: Real-Time Call Assistance

### 4.1 Summary

During a live sales conversation, CallZen listens to both sides, understands where the conversation is going, and shows the user short, timely text suggestions on what to say or do next. These suggestions are guided by the Assistant Agent the user has chosen. When the call ends, CallZen keeps the recording and transcript and produces a full performance analysis.

### 4.2 Call Capture

#### 4.2.1 Supported Call Types

1. **Online meeting calls**: Google Meet, Zoom, Microsoft Teams and other web-based meeting platforms. CallZen should capture both the user's voice and the other participants' voices.
2. **External / microphone calls**: calls that happen outside the computer, such as a mobile phone call on speakerphone or a desk phone. CallZen captures the conversation through the computer's microphone. This is the main mode for cold calls.

#### 4.2.2 Capture Behavior

- The user starts and stops capture manually with a clear **Start Call** / **End Call** control.
- Before starting, the user picks:
  - The **call type** (online meeting or external/microphone).
  - The **Assistant Agent** to use.
  - Optionally, **call context** such as the prospect's name, company, role, notes, the goal of the call, or a link to a prior call with the same prospect.
- CallZen should tell the speakers apart as well as it can (the user vs. the prospect or prospects) so that suggestions and analysis are accurate.
- A clear, always-visible indicator must show when recording is active.
- The user can **pause and resume** capture during a call (for example during off-topic or sensitive moments).
- If capture is interrupted (lost audio, closed meeting), CallZen should notify the user, try to recover, and keep whatever was captured.

#### 4.2.3 Consent and Legal Considerations

- Recording laws differ by country and region. Some require all parties to consent.
- CallZen must remind users of their responsibility to get consent before recording.
- CallZen should provide an optional, customizable **consent disclosure line** that the user can read at the start of a call. The co-pilot can suggest it as the first line.
- Users must be able to use real-time suggestions **without keeping a recording**, if they prefer (see 4.6.4).

### 4.3 Real-Time Suggestions

#### 4.3.1 What the User Sees

During a call, the user sees a compact **Live Assist panel** that can sit beside their meeting window or phone. It shows:

- **Primary suggestion**: the single best next thing to say, phrased as a ready-to-speak line or short talking points.
- **Alternative suggestions** (optional): one or two other options, for example a softer or a more direct version.
- **Suggestion type label** so the user can see the purpose at a glance, for example:
  - *Opener / Hook*
  - *Discovery Question*
  - *Objection Response*
  - *Value Statement / Pitch*
  - *Buying Signal Detected*
  - *Next Step / Close*
  - *Reminder* (for example "You haven't asked about budget yet")
  - *Warning* (for example "You're talking too much", "Prospect sounds disengaged")
- **Live transcript** (collapsible) so the user can glance back at what was said.
- **Script progress** (optional): where the user is in their script or call framework, and which key steps are done or still to do.
- **Key info cards** (optional): quick facts from the agent's knowledge, such as pricing, a feature answer or a competitor comparison, shown when a relevant topic comes up.

#### 4.3.2 Suggestion Behavior

- **Speed is critical.** Suggestions must appear fast enough to be useful mid-conversation, ideally within a second or two after the prospect finishes speaking. A late suggestion is a useless suggestion.
- **Brevity is critical.** Suggestions must be short and scannable. The user is talking and listening at the same time, so they cannot read paragraphs.
- **Relevance**: suggestions should respond to what the prospect *actually said*, not just repeat the next line of the script.
- **Script adherence with flexibility**: the co-pilot should guide the user back to the script and its goals while adapting naturally when the conversation goes elsewhere.
- **Objection detection**: when the prospect raises an objection ("too expensive", "send me an email", "we already have a provider", "not interested", "call me later"), the co-pilot should recognize it right away and offer a response, preferably one from the user's script if one exists.
- **Buying signal detection**: when the prospect shows interest ("how does pricing work?", "can it do X?", "who else uses this?"), the co-pilot should flag it and suggest how to move forward.
- **Non-intrusive**: the user should be able to dismiss, pin or ignore suggestions without disrupting the call.
- **Updates as the conversation changes**: new suggestions replace old ones as the conversation moves on. Recent suggestions stay accessible in a short history.

#### 4.3.3 User Controls During a Call

- Switch to a different Assistant Agent mid-call (optional / nice-to-have).
- Ask the co-pilot a quick question by typing (for example "what's our pricing for 50 seats?") and get an instant answer.
- Mark a moment as important ("bookmark") for review afterwards.
- Adjust suggestion frequency (for example: only on objections/questions, balanced, or constant guidance).
- Mute suggestions temporarily without stopping the recording.

### 4.4 AI Model Selection

- Each Assistant Agent is powered by an AI model.
- The **user can choose the model** for each agent from a list of supported options.
- CallZen provides a **recommended default model**, chosen to balance speed (critical for real time) and quality of reasoning. It is clearly labeled "Recommended".
- The model selection screen should help non-technical users decide by showing simple descriptors per model, such as:
  - Speed (Fast / Balanced / Thorough)
  - Quality of suggestions
  - Relative cost, if relevant to the user
  - Language support
- The model used for **real-time suggestions** and the model used for **post-call analysis** can be configured separately, since post-call analysis can favor depth over speed.
- If a chosen model is unavailable, CallZen should fall back to the recommended default and tell the user.

### 4.5 Assistant Agents (Multiple Co-pilots)

#### 4.5.1 Purpose

Users sell in different contexts: different products, audiences, call stages and languages. So they can create **multiple Assistant Agents**, each tuned for a specific purpose.

**Examples:**
- "Cold Call – SaaS Startups": a short, punchy opener script focused on booking a demo.
- "Discovery Call – Enterprise": deep qualification questions (budget, authority, need, timeline).
- "Real Estate Buyer Calls": property-focused questions and financing objections.
- "Renewal & Upsell": focused on account expansion and retention.
- "Greek-Language Cold Calls": the same product, but suggestions in another language.

#### 4.5.2 Agent Configuration

Each Assistant Agent has:

| Setting | Description |
|---|---|
| **Name** | A user-friendly name. |
| **Description / Purpose** | What the agent is for, such as cold calling, discovery, closing or follow-up. |
| **Call Goal** | The desired outcome of calls with this agent, such as "book a demo", "qualify the lead", "close the deal" or "schedule a site visit". |
| **Script** | The sales script, written or pasted in. It can be structured into stages (opener, pitch, discovery, objection handling, close). |
| **Instructions** | Free-form guidance on tone, rules and priorities (for example "Keep suggestions under 20 words", "Never discount more than 10%", "Use a friendly, informal tone"). |
| **Knowledge / Context** | Product info, pricing, FAQs, competitor comparisons, testimonials, ideal customer profile. The user can enter this as text or upload documents. |
| **Objection Library** | Common objections paired with preferred responses. |
| **Sales Methodology** (optional) | An optional framework to follow, such as SPIN, BANT, MEDDIC, Challenger, Sandler or a custom one. |
| **Language** | The language of the conversation and of the suggestions. |
| **Tone / Style** | For example professional, friendly, consultative or assertive. |
| **Suggestion Settings** | Frequency, length, and number of alternative suggestions. |
| **AI Model** | Real-time model and analysis model (see 4.4). |
| **Analysis Criteria** | What this agent's post-call analysis should focus on and how it scores (see 4.6.3). |

#### 4.5.3 Agent Management

- Create, edit, duplicate, archive and delete agents.
- Mark one agent as the **default**.
- Start from **templates** (for example "Generic Cold Call", "B2B Discovery", "Real Estate", "Insurance", "Recruiting") to get going quickly.
- See per-agent statistics such as number of calls, average score and trend over time.

### 4.6 Post-Call Storage and Analysis

#### 4.6.1 What Is Stored After Each Call

- The **recording** (audio).
- The full **transcript**, labeled by speaker and timestamped.
- **Call metadata**: date, time, duration, call type, Assistant Agent used, prospect/context info, outcome.
- The **suggestions shown** during the call, and whether the user appeared to follow them.
- **Bookmarks** the user made.
- The **Call Analysis** report.

#### 4.6.2 Call Outcome

At the end of a call, the user can (optionally) record the outcome, such as:
- Meeting / demo booked
- Deal closed / won
- Follow-up scheduled
- Not interested / lost
- No decision / callback
- Gatekeeper / wrong person
- Custom outcome

This links performance to real results and makes the analysis more meaningful.

#### 4.6.3 Call Analysis Report

After the call, CallZen automatically generates a report that includes:

**a) Overall Score**
- A single overall performance score (for example 0–100), with a short summary verdict.

**b) Category Scores**
Sub-scores for key sales skills, for example:
- Opening / first impression
- Rapport building
- Discovery and questioning
- Active listening
- Value communication / pitch clarity
- Objection handling
- Confidence and tone
- Control of the conversation
- Closing / securing next steps
- Script adherence

Users can customize, add or reweight these categories per Assistant Agent.

**c) Mistakes**
- Specific mistakes, each linked to the exact moment in the transcript and recording. Examples: interrupting the prospect, missing a buying signal, giving up after the first objection, talking over the prospect, pitching before discovering needs, not confirming next steps.
- For each mistake: **what happened**, **why it matters**, and **what to say or do instead**.

**d) Strengths**
- What the user did well, also linked to specific moments, so good behavior is reinforced.

**e) Areas for Improvement**
- A short, prioritized list (for example the top 3) of things to focus on next time, with concrete tips.

**f) Conversation Metrics**
- Talk-to-listen ratio
- Number of questions asked
- Longest monologue
- Speaking pace
- Filler words
- Interruptions
- Number of objections raised and how many were handled successfully

**g) Prospect Insights**
- A summary of the prospect's needs, pain points, objections, interest level and buying signals.
- Key information the prospect revealed (budget, timeline, decision makers, competitors).

**h) Call Summary and Next Steps**
- A concise summary of the conversation.
- Agreed next steps and suggested follow-up actions.
- An optional draft follow-up message (email / text) based on the call.

**i) Suggested Practice**
- Recommendations to practice specific weaknesses, with a one-click option to start a matching Practice Session (see Section 6).

#### 4.6.4 Call History and Review

- A **Call Library** listing all past calls with search and filters (date, agent, call type, outcome, score, prospect).
- A **Call Detail view** where the user can:
  - Play back the recording with a synced transcript.
  - Jump to mistakes, strengths, objections and bookmarks on a timeline.
  - Read the full analysis.
  - Re-run the analysis, for example with different criteria or a different model.
  - Add personal notes.
- **Retention controls**: the user can delete recordings, transcripts or entire calls, and can choose to keep only transcripts and analysis without the audio.

#### 4.6.5 Progress Tracking

- A **dashboard** showing performance over time: score trends, category trends, recurring mistakes, outcome rates.
- Comparisons between Live Calls and Practice Sessions.
- Highlights such as "Your objection handling improved 15% over the last 10 calls".

---

## 5. Feature 2: Sales Practice Agents

### 5.1 Summary

Users create AI-powered voice agents that play the role of a prospect. The user talks to the agent out loud, in real time, as if it were a real call. The agent responds naturally with a realistic voice and personality, raises objections, asks questions and reacts to how well the user sells, based on the configured scenario and difficulty.

### 5.2 Voice Experience

- Conversations are **real-time and spoken**: the user speaks into the microphone and the agent replies with a natural-sounding voice.
- The conversation should feel natural:
  - Low delay between the user finishing and the agent replying.
  - The agent can be interrupted, just like a real person.
  - Natural speech, including hesitation, short answers and changes of mind where appropriate for the persona.
- **No avatars** in this phase. The interface can show a simple visual indicator (for example the name, a role badge and an animated speaking indicator).
- A live **transcript** of the practice conversation is available (it can be hidden for a more realistic experience).

### 5.3 Voice Provider and Voice Selection

- Users can **choose between several voice AI providers** to power their practice agents.
- CallZen provides a **recommended default provider**.
- Within a provider, users can choose a **voice** (for example gender, age range, accent and speaking style) that fits the persona.
- Provider choice may affect realism, speed, available languages, available voices and cost. The selection screen should explain these trade-offs in plain language.

### 5.4 Practice Agent Configuration

Each Practice Agent represents a simulated prospect. The user configures:

#### 5.4.1 Role and Scenario (core)

- **Role prompt**: a free-text description of who the prospect is and what they want. Examples:
  - "A 35-year-old who wants to buy a family car and is comparing several dealerships."
  - "A couple looking for a 3-bedroom house in the suburbs with a limited budget."
  - "The operations manager of a 50-person logistics company who is frustrated with their current software."
  - "A small restaurant owner being cold-called about a POS system."
- **Scenario context**: the situation of the call. Examples: an inbound inquiry, a cold call out of the blue, a follow-up after a demo, a renewal conversation, a price negotiation.
- **What the user is selling**: the product or service the user represents in this scenario. This can be linked to an Assistant Agent's knowledge so both sides share the same product context.
- **Call objective for the user**: what counts as "success" in this practice session, such as booking a meeting, closing the sale or getting past the gatekeeper.

#### 5.4.2 Prospect Characteristics

| Parameter | Options / Description |
|---|---|
| **Lead Temperature** | **Cold**: never heard of the user or company, no expressed interest, possibly busy or annoyed at being called. **Warm**: has shown interest (inquired, downloaded something, was referred, or had prior contact) and is more open to talking. *(Hot may be added later.)* |
| **Difficulty Level** | **Easy**: friendly, open, few objections, converts readily with a reasonable pitch. **Medium**: some skepticism, raises a few genuine objections, needs good discovery and value. **Hard**: skeptical, busy or guarded, raises tough and repeated objections, may try to end the call early, converts only with excellent technique. *(The scale could be a slider or more levels, such as 1–5.)* |
| **Personality Type** | For example analytical, driver/direct, amiable/friendly, expressive/talkative, skeptical, indecisive. |
| **Mood / Attitude** | For example neutral, rushed, irritated, curious, distracted, enthusiastic. |
| **Communication Style** | For example short answers vs. talkative, formal vs. casual, direct vs. vague. |
| **Decision-Making Authority** | Decision maker, influencer, gatekeeper (for example an assistant or receptionist), or needs approval from someone else. |
| **Budget Situation** | For example no budget, limited budget, budget available, price-sensitive. |
| **Timeline / Urgency** | For example urgent need, within 3 months, just researching, no timeline. |
| **Current Solution / Competitor** | Whether they already use a competitor or alternative, and how satisfied they are with it. |
| **Pain Points** | The prospect's real underlying problems. These may be hidden and only revealed if the user asks good discovery questions. |
| **Objections** | Specific objections the prospect will raise (for example "too expensive", "send me info", "bad timing", "need to talk to my partner", "we're happy with our current vendor"), plus how persistent each one is. |
| **Hidden Information** | Facts the prospect will only share if asked the right questions or if enough trust is built. This rewards good discovery. |
| **Conversion Conditions** | What the user must do or achieve for the prospect to agree (for example "must address the price concern with ROI", "must ask about the current pain before pitching"). |
| **Patience / Hang-up Threshold** | How quickly the prospect loses interest or ends the call if the user performs poorly. |
| **Language and Accent** | The language the prospect speaks, and an optional accent or regional style. |
| **Industry / Demographics** | Industry, company size, job title, age range and similar background details for realism. |
| **Background Story** | Optional free-text backstory that adds depth and consistency to the persona. |

#### 5.4.3 Realism Rules

- The prospect should **stay in character** throughout the session.
- The prospect should **react to the user's performance**: becoming more open with good rapport and relevant questions, more resistant with pushy or irrelevant pitching.
- The prospect should **not volunteer everything**. Information should be revealed in a realistic way.
- The prospect may **end the call** if the user performs badly enough, based on the patience threshold, just like a real prospect would.
- The prospect should **not coach the user** or step out of the role during the session.

#### 5.4.4 Practice Agent Management

- Create, edit, duplicate, archive and delete Practice Agents.
- **Templates / presets** for common scenarios (for example "Cold Call – Busy Business Owner", "Gatekeeper", "Price Objection Buyer", "Warm Inbound Lead", "Car Buyer", "Home Buyer").
- **Randomize** option: generate a random prospect within chosen limits (for example "random hard cold B2B prospect") so the user can't memorize scenarios.
- **Auto-generate from description**: the user describes a scenario in a sentence and CallZen fills in the detailed characteristics, which the user can then adjust.

### 5.5 Practice Session Flow

1. The user picks a Practice Agent (or a template, or a random one).
2. Optionally, the user reads a short **briefing** describing what the salesperson would realistically know before the call, such as the prospect's name, company and source of the lead. Hidden characteristics are *not* shown.
3. The user starts the session. Depending on the scenario, either the agent "answers the phone" (cold call) or the user is "connected" to the prospect.
4. The conversation happens in real time by voice.
5. The session ends when the user ends it, when the prospect hangs up, or when a time limit is reached (optional).
6. CallZen generates a **Practice Analysis** in the same format as the Live Call analysis (see 4.6.3), plus practice-specific information:
   - Whether the user achieved the objective (for example "Meeting booked: Yes/No").
   - What the prospect was "thinking": a reveal of the hidden pain points, objections and conversion conditions, and whether the user uncovered them.
   - What would have changed the outcome.
7. The user can **retry** the same scenario, try a harder version, or move to a recommended next scenario.

### 5.6 Practice Progress

- Practice sessions appear in the Call Library, clearly labeled as Practice.
- A practice-specific progress view shows scores by scenario type, difficulty level and lead temperature.
- Optional future gamification: streaks, levels, unlocking harder difficulty levels and personal bests.

---

## 6. Feature 3: Integration Between Both Features (Integrated Practice Mode)

### 6.1 Summary

Users can run a Practice Session with a Practice Agent (the AI prospect) **while an Assistant Agent (the co-pilot) gives real-time text suggestions**, exactly as it would on a real call. This lets users:

- Learn how to use the co-pilot effectively in a safe environment before going live.
- Test and refine their Assistant Agents' scripts, instructions and knowledge against realistic prospects before using them with real customers.
- Build the habit of reading and using suggestions while still talking naturally.

### 6.2 Roles in Integrated Practice Mode

There are two separate and independent AI agents in the session:

| Agent | Role | Interaction |
|---|---|---|
| **Practice Agent (AI Prospect)** | Plays the customer and speaks by voice. | The user talks to it. |
| **Assistant Agent (Co-pilot)** | Coaches the user and shows text suggestions only. | The user reads it. The prospect does **not** know about it and cannot "hear" it. |

The two agents must stay strictly separate. The prospect must never get access to the co-pilot's suggestions, script or knowledge, and must not change its behavior because a co-pilot is present.

### 6.3 Behavior

- When starting a Practice Session, the user can turn on **"Practice with Co-pilot"** and pick which Assistant Agent to use.
- The Live Assist panel works the same way as on a real call: same layout, same suggestion types, same controls.
- The post-session analysis includes everything from a normal practice analysis, plus:
  - **Suggestion usage**: how often the user followed, adapted or ignored suggestions, and how that affected the outcome.
  - **Co-pilot effectiveness**: which suggestions helped and which did not. This helps the user improve their Assistant Agent's script and instructions.
- Users can switch between **Practice with Co-pilot** and **Practice without Co-pilot** to measure how they perform on their own.

### 6.4 Recommended Training Loop

CallZen should encourage and make easy the following improvement cycle:

1. **Practice** a scenario with the co-pilot on.
2. **Review** the analysis and refine the Assistant Agent's script and instructions.
3. **Practice again** without the co-pilot to build independent skill.
4. **Go live** on real calls with the co-pilot.
5. **Analyze** live calls, find weak areas, and generate matching practice scenarios.
6. Repeat.

### 6.5 Linking Live Calls to Practice

- From any Live Call analysis, the user can create a **Practice Agent based on that real prospect**, recreating the persona, objections and scenario so they can rehearse the follow-up call or replay a call that went badly.
- Recurring mistakes found across live calls should lead to **recommended practice scenarios** that target them.

---

## 7. Cross-Cutting Requirements

### 7.1 User Experience Principles

- **Minimal distraction during calls.** The Live Assist panel must be glanceable, compact and calm. The user's attention belongs to the prospect.
- **Fast setup.** A new user should be able to make their first assisted call or practice session within a few minutes, using templates and defaults.
- **Sensible defaults, deep customization.** Everything works out of the box with recommended settings, and advanced users can fine-tune everything.
- **Plain language.** Model and provider choices are explained in terms of speed, quality and cost, not technical jargon.
- **Clear status at all times.** The user always knows whether they are being recorded, whether the co-pilot is active, and whether they are in a live call or a practice session.

### 7.2 Languages

- Support for multiple conversation languages, both for Live Calls and Practice Sessions.
- Suggestions and analysis can be in the conversation language or in the user's preferred interface language.

### 7.3 Privacy, Security and Trust

- Recordings, transcripts and agent configurations are private to the user by default.
- Users can delete any call or recording at any time, and deletion is permanent.
- Users are informed about which third-party AI providers process their data, based on the models and voice providers they select.
- Sensitive information the user provides (scripts, pricing, customer details) is treated as confidential.
- Clear consent reminders around call recording (see 4.2.3).

### 7.4 Reliability

- If AI suggestions are temporarily unavailable, the call recording must continue without interruption, and the user should be told in an unobtrusive way.
- If the analysis fails, the recording and transcript must still be saved, and the user can retry the analysis later.
- No call data should be lost if the user's connection drops briefly.

### 7.5 Cost Transparency

- Since AI model and voice provider choices can affect cost, users should be able to see usage (for example minutes used, number of analyses) and, where relevant, estimated costs per model or provider.

---

## 8. Example User Journeys

### 8.1 Cold Call with Co-pilot

1. Maria, an SDR, opens CallZen and selects her "Cold Call – Dental Clinics" Assistant Agent.
2. She picks **External / Microphone** mode, enters the clinic's name, and presses **Start Call**.
3. She dials the clinic from her phone on speaker. The receptionist answers, and the co-pilot shows a gatekeeper opener from her script.
4. The receptionist says "the doctor is busy, send an email". The co-pilot flags *Objection: Brush-off* and suggests a short response that asks for a better time to call back.
5. She gets transferred to the doctor. The co-pilot moves to the opener, then suggests discovery questions. When the doctor asks "how much does it cost?", the co-pilot flags *Buying Signal* and suggests a value-first answer followed by a meeting ask.
6. She books a demo, ends the call and marks the outcome as **Meeting Booked**.
7. A few moments later she reviews her report: an overall score of 78, strong opener, but she talked 65% of the time and missed a chance to ask about their current system. The report suggests a practice scenario: "Busy Clinic Owner – Hard – Cold".

### 8.2 Practice Session

1. Maria opens the suggested practice scenario. The briefing says: "Dr. Papadopoulos, clinic owner, cold call, never heard of you."
2. She starts the session. The AI prospect answers, sounding rushed and slightly annoyed.
3. She tries to pitch too early, and the prospect says "I'm not interested" and starts to end the call. She recovers with a question about patient no-shows, and the prospect opens up.
4. The session ends without a booking. The analysis reveals the hidden pain point (no-shows costing revenue) and the condition for conversion (show a concrete ROI). It also shows exactly where she lost the prospect's attention.
5. She retries and books the meeting on her second attempt.

### 8.3 Integrated Practice

1. Before launching a new product, Alex creates a new Assistant Agent "Enterprise Discovery – New Product" with a fresh script.
2. He creates three Practice Agents: an easy warm lead, a medium skeptical IT manager, and a hard procurement officer focused on price.
3. He runs practice sessions with **Co-pilot ON** and sees from the analysis that the co-pilot's pricing objection responses were too weak.
4. He updates the agent's objection library and runs the sessions again. His scores and conversion rates improve.
5. He starts using the refined Assistant Agent on real calls.

---

## 9. Success Metrics

- **Activation**: percentage of new users who complete their first assisted call or practice session.
- **Engagement**: number of assisted calls and practice sessions per user per week.
- **Suggestion usefulness**: percentage of suggestions followed or rated helpful.
- **Improvement**: average change in user scores over time.
- **Business outcomes**: change in user-reported outcome rates (meetings booked, deals closed) over time.
- **Retention**: weekly and monthly active users.
- **Satisfaction**: user ratings of suggestions, analyses and practice realism.

---

## 10. Phasing (Suggested)

| Phase | Scope |
|---|---|
| **Phase 1 – Core** | Microphone and online meeting call capture; Assistant Agents (create, configure, script, instructions); real-time suggestions; model selection with recommended default; recording storage; post-call analysis; call library. |
| **Phase 2 – Practice** | Practice Agents with configurable prospect characteristics; multiple voice providers; practice analysis with "prospect reveal"; templates and randomization. |
| **Phase 3 – Integration** | Integrated Practice Mode (co-pilot during practice); suggestion-usage analysis; practice scenarios generated from live calls; progress dashboard. |
| **Future** | Avatars; team/manager features; CRM and calendar integrations; gamification; Hot lead temperature and more difficulty levels; shared scenario libraries. |

---

## 11. Open Questions

1. Should the Live Assist panel be available as a floating window over other apps, as a side panel next to meeting platforms, or both?
2. How should the app handle calls with multiple prospects (group calls)? Should suggestions target a specific participant?
3. Should users be able to give feedback (thumbs up/down) on individual suggestions to improve future ones?
4. What scoring scale works best: 0–100, 1–10 or letter grades?
5. Should there be a maximum call or practice session length?
6. Should the user be able to rate the realism of a Practice Agent, so it can be improved?
7. How much of a Practice Agent's hidden configuration should be revealed after a session (all of it, or only what's relevant to the mistakes)?
8. Should the product support teams from the start (shared agents, manager review), or stay single-user for now?
9. What should happen when a call is in a language the chosen model or voice provider supports poorly?
10. Is a free tier or trial planned, and how will usage limits work?
