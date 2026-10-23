export function TeamsSection() {
  return (
    <section id="teams" className="lz-section" aria-labelledby="teams-title">
      <div className="lz-wrap lz-split">
        <div>
          <h2 id="teams-title" className="lz-h2">
            Built for teams that sell together
          </h2>
          <p className="lz-copy" style={{ marginTop: "1.5rem" }}>
            Co-pilots, prospects and calls live inside an organisation, and you can belong to several and switch
            between them. Invite people by email; invitations last seven days.
          </p>
          <dl className="lz-roles">
            <div>
              <dt>Owner</dt>
              <dd>Controls everything, including what admins and members can do.</dd>
            </div>
            <div>
              <dt>Admin</dt>
              <dd>Manages the team with the permissions the owner grants.</dd>
            </div>
            <div>
              <dt>Member</dt>
              <dd>Uses co-pilots, manages prospects, and reviews their own calls.</dd>
            </div>
          </dl>
        </div>

        <div>
          <h2 className="lz-h2">Consent first, and you decide what&rsquo;s kept</h2>
          <p className="lz-copy" style={{ marginTop: "1.5rem" }}>
            Always get consent before recording a call. CallZen reminds you, and gives you the controls to match: set
            how long recordings are kept, and delete your account and its data when you&rsquo;re done.
          </p>
        </div>
      </div>
    </section>
  );
}
