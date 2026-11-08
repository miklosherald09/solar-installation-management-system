/**
 * Privacy Policy — Solar Installation Management System
 *
 * Drop-in page for a Next.js app.
 *   App Router:   app/privacy-policy/page.tsx
 *   Pages Router: pages/privacy-policy.tsx  (the `metadata` export is ignored there)
 *
 * Styling uses Tailwind utility classes. No client-side hooks, so this stays a
 * React Server Component.
 *
 * BEFORE PUBLISHING: fill in LEGAL_ENTITY and BUSINESS_ADDRESS below. Google Play
 * and the App Store both require a reachable operator identity, and the
 * Philippine Data Privacy Act requires the personal information controller to be
 * identifiable.
 */

export const metadata = {
  title: 'Privacy Policy — Solar Installation Management System',
  description:
    'How Solar Installation Management System collects, uses, shares, and protects your personal information.',
};

const APP_NAME = 'Solar Installation Management System';
const CONTACT_EMAIL = 'service@solarimsys.online';
const EFFECTIVE_DATE = 'August 5, 2026';
const LAST_UPDATED = 'August 5, 2026';

// TODO: replace with your registered business name and address.
const LEGAL_ENTITY = 'Solar Installation Management System';
const BUSINESS_ADDRESS = '[Registered business address], Philippines';

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mt-12 mb-4 text-2xl font-semibold tracking-tight text-gray-900">
        {title}
      </h2>
      <div className="space-y-4 text-[15px] leading-7 text-gray-700">
        {children}
      </div>
    </section>
  );
}

function Table({
  head,
  rows,
}: {
  head: string[];
  rows: (string | React.ReactNode)[][];
}) {
  return (
    <div className="my-6 overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-gray-50">
          <tr>
            {head.map(h => (
              <th
                key={h}
                className="border-b border-gray-200 px-4 py-3 font-semibold text-gray-900"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="align-top">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="border-b border-gray-100 px-4 py-3 leading-6 text-gray-700"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PrivacyPolicy() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="border-b border-gray-200 pb-8">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-gray-500">
          Effective date: {EFFECTIVE_DATE} &middot; Last updated: {LAST_UPDATED}
        </p>
      </header>

      <div className="mt-8 space-y-4 text-[15px] leading-7 text-gray-700">
        <p>
          This Privacy Policy explains how {LEGAL_ENTITY} (&ldquo;{APP_NAME}
          ,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;)
          collects, uses, discloses, and safeguards your personal information
          when you use the {APP_NAME} mobile application for iOS and Android and
          any related websites or services (together, the
          &ldquo;Service&rdquo;).
        </p>
        <p>
          {APP_NAME} is a community marketplace where people post everyday jobs
          &mdash; such as cleaning, gardening, pet sitting, car washing,
          repairs, moving, painting, construction, and driving &mdash; and where
          other people can find and respond to those jobs.
        </p>
        <p className="rounded-lg bg-amber-50 p-4 text-[15px] text-amber-900 ring-1 ring-amber-200">
          <strong>Please read this carefully.</strong> By downloading,
          installing, or using the Service, you acknowledge that you have read
          and understood this Privacy Policy. If you do not agree with it,
          please do not use the Service.
        </p>
      </div>

      <Section id="controller" title="1. Who we are">
        <p>
          {LEGAL_ENTITY} is the operator of the Service and acts as the
          controller (in the Philippines, the &ldquo;personal information
          controller&rdquo;) of the personal data described in this policy.
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>Operator:</strong> {LEGAL_ENTITY}
          </li>
          <li>
            <strong>Address:</strong> {BUSINESS_ADDRESS}
          </li>
          <li>
            <strong>Contact:</strong>{' '}
            <a
              className="font-medium text-blue-600 underline underline-offset-2"
              href={`mailto:${CONTACT_EMAIL}`}
            >
              {CONTACT_EMAIL}
            </a>
          </li>
        </ul>
      </Section>

      <Section id="collect" title="2. Information we collect">
        <p>
          We collect only what the Service needs in order to function. The table
          below lists every category of personal information we handle, why we
          handle it, and where it comes from.
        </p>

        <h3 className="mt-8 text-lg font-semibold text-gray-900">
          2.1 Information you provide to us
        </h3>
        <Table
          head={['Category', 'What it includes', 'Why we collect it']}
          rows={[
            [
              'Account information',
              'Your name, email address, and profile photo, received from Google when you sign in with your Google account.',
              'To create and maintain your account, identify you to other users you interact with, and secure your session.',
            ],
            [
              'Job post content',
              'Job description, category, budget and budget type, job location (address text and coordinates), contact phone number, preferred date, tags, and any photos you upload.',
              'To publish your job posting so other users in your community can see and respond to it.',
            ],
            [
              'Photos and images',
              'Images you select from your device photo library and attach to a job post.',
              'To display your job posting. We access your photo library only at the moment you tap to add an image, and only the images you pick are uploaded.',
            ],
            [
              'Messages',
              'The content of messages you send through the in-app chat, the participants of a conversation, timestamps, any attachments, and read/unread status.',
              'To deliver your messages to the other participant and to show your conversation history and unread badges.',
            ],
            [
              'Search activity',
              'The search terms you type into the in-app search.',
              'To power the "Recent searches" feature so you can quickly repeat a previous search. You can delete individual searches from the Recent Searches screen at any time.',
            ],
            [
              'Support correspondence',
              'Anything you send us by email, including your email address and the content of your message.',
              'To respond to your questions, reports, and requests.',
            ],
          ]}
        />

        <h3 className="mt-8 text-lg font-semibold text-gray-900">
          2.2 Information collected automatically
        </h3>
        <Table
          head={['Category', 'What it includes', 'Why we collect it']}
          rows={[
            [
              'Precise location',
              'Your device’s GPS coordinates (latitude and longitude), and the street address we derive from them.',
              'Only when you tap "Use current location" to fill in a job address, or when you use the "Near me" filter to find jobs within a chosen distance. See section 3.',
            ],
            [
              'Saved location preferences',
              'The location and search radius (in kilometres) you set for the "Near me" filter.',
              'So your preferred search area persists across app restarts and devices.',
            ],
            [
              'Device identifier',
              'A random identifier the app generates on first launch and stores locally on your device. It is not your advertising ID, IMEI, MAC address, or any hardware serial number.',
              'To keep track of which of your devices should receive push notifications, and to remove the correct device when you sign out.',
            ],
            [
              'Push notification token',
              'A Firebase Cloud Messaging (FCM) registration token issued by Google, plus your platform (iOS or Android).',
              'To deliver push notifications to your device. See section 5.',
            ],
            [
              'Technical and log data',
              'IP address, request timestamps, app version, and error diagnostics recorded by our servers when your app communicates with them.',
              'To operate and secure the Service, diagnose faults, and prevent abuse.',
            ],
          ]}
        />

        <h3 className="mt-8 text-lg font-semibold text-gray-900">
          2.3 What we do <em>not</em> collect
        </h3>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            We do <strong>not</strong> collect or store your Google password.
            Authentication happens entirely through Google.
          </li>
          <li>
            We do <strong>not</strong> process payments and do{' '}
            <strong>not</strong> collect credit card, debit card, or bank
            account details. Payment between a job poster and a worker is
            arranged and settled directly between them, outside the Service.
          </li>
          <li>
            We do <strong>not</strong> use third-party advertising networks, we
            do <strong>not</strong> serve ads, and we do <strong>not</strong>{' '}
            sell your personal information.
          </li>
          <li>
            We do <strong>not</strong> track you across other companies&rsquo;
            apps or websites, and we therefore do not present the App Tracking
            Transparency prompt on iOS.
          </li>
          <li>
            We do <strong>not</strong> collect special categories of sensitive
            data such as health, biometric, genetic, racial, religious, or
            political information. Please do not include such information in job
            posts or messages.
          </li>
        </ul>
      </Section>

      <Section id="location" title="3. Location data — detailed disclosure">
        <p>
          {APP_NAME} requests permission to access your device&rsquo;s precise
          location. We want to be completely clear about how this works:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Foreground only.</strong> We request &ldquo;while using the
            app&rdquo; access. {APP_NAME} does not collect your location in the
            background or when the app is closed.
          </li>
          <li>
            <strong>Only on your action.</strong> Your location is read only
            when you tap &ldquo;Use current location&rdquo; while setting a job
            address, or when you enable the &ldquo;Near me&rdquo; filter. We do
            not continuously track your movements.
          </li>
          <li>
            <strong>What gets published.</strong> The address and coordinates
            you attach to a job post become part of that public posting and are
            visible to other users. Choose a general area rather than your exact
            home address if you prefer not to reveal it.
          </li>
          <li>
            <strong>Address lookup.</strong> To turn coordinates into a readable
            address (and to search for places by name) we send the coordinates
            or search text to the OpenStreetMap Nominatim service. Map tiles and
            map display are provided by Google Maps. These providers receive the
            query but not your account identity.
          </li>
          <li>
            <strong>You can say no.</strong> Denying or revoking location
            permission does not block you from using {APP_NAME}. You can still
            browse jobs and set a job location manually by searching for a place
            or dragging the map pin. You can revoke the permission at any time
            in your device settings.
          </li>
        </ul>
      </Section>

      <Section id="use" title="4. How we use your information">
        <p>We use personal information to:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>create, authenticate, and maintain your account;</li>
          <li>
            publish your job postings and show them to other users, including in
            distance-based search results;
          </li>
          <li>
            let you and other users contact each other through in-app messaging;
          </li>
          <li>
            send push notifications about activity relevant to you (see section
            5);
          </li>
          <li>
            provide search and &ldquo;Recent searches&rdquo; functionality, and
            remember your &ldquo;Near me&rdquo; preferences;
          </li>
          <li>respond to your support requests and reports;</li>
          <li>
            detect, investigate, and prevent fraud, spam, abuse, harassment, and
            violations of our Terms and Conditions;
          </li>
          <li>
            maintain the security, integrity, and reliability of the Service,
            including diagnosing crashes and errors;
          </li>
          <li>
            comply with legal obligations and respond to lawful requests from
            authorities.
          </li>
        </ul>
        <p>
          We do not use your personal information to make decisions about you by
          solely automated means that produce legal or similarly significant
          effects.
        </p>
      </Section>

      <Section id="notifications" title="5. Push notifications">
        <p>
          With your permission, we send push notifications when someone
          expresses interest in a job you posted, and when you receive a new
          message. To do this we store an FCM token together with your account
          ID, device identifier, and platform.
        </p>
        <p>
          You can turn notifications off at any time in your device settings.
          When you sign out, the device token associated with that device is
          deleted from our records.
        </p>
      </Section>

      <Section id="legal-basis" title="6. Legal bases for processing">
        <p>
          Where the EU/UK GDPR or a comparable law applies to you, we rely on the
          following legal bases. Under the Philippine Data Privacy Act of 2012
          (Republic Act No. 10173), we rely on the corresponding criteria for
          lawful processing.
        </p>
        <Table
          head={['Purpose', 'Legal basis']}
          rows={[
            [
              'Creating your account, publishing your posts, delivering your messages',
              'Performance of a contract with you (our Terms and Conditions).',
            ],
            [
              'Accessing precise location; accessing your photo library; sending push notifications',
              'Your consent, given through the operating system permission prompt. You may withdraw it at any time in device settings.',
            ],
            [
              'Security, abuse prevention, fault diagnosis, service improvement',
              'Our legitimate interests in running a safe and functional service, balanced against your rights.',
            ],
            [
              'Retaining records for legal claims, responding to lawful requests',
              'Compliance with a legal obligation, or our legitimate interest in establishing or defending legal claims.',
            ],
          ]}
        />
      </Section>

      <Section id="sharing" title="7. How we share information">
        <p>
          We do not sell your personal information and we do not share it for
          cross-context behavioural advertising. We disclose information only as
          described below.
        </p>

        <h3 className="mt-8 text-lg font-semibold text-gray-900">
          7.1 With other users
        </h3>
        <p>
          By design, some information is visible to other users of the Service:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>Your job posts</strong> &mdash; the description, category,
            budget, location, photos, preferred date, tags, and the contact
            phone number you enter are shown publicly within the app to anyone
            browsing jobs.
          </li>
          <li>
            <strong>Your name and profile photo</strong> &mdash; shown to users
            you message with, and to people viewing a job you posted.
          </li>
          <li>
            <strong>Message content</strong> &mdash; visible to the other
            participant in that conversation.
          </li>
        </ul>
        <p>
          Treat anything you put in a public job post as public. Do not post
          identity documents, financial details, or other sensitive information.
        </p>

        <h3 className="mt-8 text-lg font-semibold text-gray-900">
          7.2 With service providers
        </h3>
        <p>
          We use a small number of providers who process data on our behalf,
          under contract, and only for the purposes we specify:
        </p>
        <Table
          head={['Provider', 'Purpose', 'Data involved']}
          rows={[
            [
              'Google (Google Sign-In)',
              'Authentication',
              'Your Google account identity, name, email, profile photo.',
            ],
            [
              'Google (Firebase Cloud Messaging)',
              'Push notification delivery',
              'Device push token, notification title and body.',
            ],
            [
              'Google (Maps Platform)',
              'Map display and place search',
              'Map interactions and coordinates.',
            ],
            [
              'OpenStreetMap Foundation (Nominatim)',
              'Converting coordinates to addresses and searching places by name',
              'Coordinates or the place text you search for.',
            ],
            [
              'Our hosting and storage infrastructure',
              'Running the application servers, the databases holding accounts, job posts and messages, and the object storage holding uploaded images',
              'All data described in section 2, as needed to operate the Service.',
            ],
          ]}
        />
        <p className="text-sm text-gray-600">
          Each provider handles data under its own privacy policy. We encourage
          you to review Google&rsquo;s Privacy Policy and the OpenStreetMap
          Foundation&rsquo;s privacy policy.
        </p>

        <h3 className="mt-8 text-lg font-semibold text-gray-900">
          7.3 For legal and safety reasons
        </h3>
        <p>
          We may disclose information if we believe in good faith that it is
          reasonably necessary to comply with a law, regulation, subpoena, court
          order, or lawful government request; to enforce our Terms and
          Conditions; to detect or address fraud or security issues; or to
          protect the rights, property, or safety of {APP_NAME}, our users, or
          the public.
        </p>

        <h3 className="mt-8 text-lg font-semibold text-gray-900">
          7.4 Business transfers
        </h3>
        <p>
          If {APP_NAME} is involved in a merger, acquisition, reorganisation, or
          sale of assets, personal information may be transferred as part of
          that transaction. We will notify you before your information becomes
          subject to a materially different privacy policy.
        </p>
      </Section>

      <Section id="retention" title="8. How long we keep your information">
        <p>
          We keep personal information only for as long as it is needed for the
          purposes described in this policy, unless a longer retention period is
          required by law.
        </p>
        <Table
          head={['Data', 'Retention']}
          rows={[
            [
              'Account information',
              'For as long as your account is active. Deleted, or irreversibly anonymised, within 30 days of a verified deletion request.',
            ],
            [
              'Job posts and uploaded images',
              'Until you delete the post, or until your account is deleted.',
            ],
            [
              'Messages and conversations',
              'Until your account is deleted. Note that a copy remains visible to the other participant in the conversation, as it is also their record.',
            ],
            [
              'Search history',
              'Until you delete individual searches in the app, or until your account is deleted.',
            ],
            [
              'Push notification tokens',
              'Deleted when you sign out on that device, when the token is invalidated by Google, or when your account is deleted.',
            ],
            [
              'Server logs',
              'Typically up to 12 months, then deleted or aggregated.',
            ],
            [
              'Records needed for legal claims, tax, or dispute resolution',
              'For the period required by applicable law.',
            ],
          ]}
        />
      </Section>

      <Section id="rights" title="9. Your rights and choices">
        <p>
          Subject to applicable law, you have the following rights over your
          personal information:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong>Access</strong> &mdash; obtain confirmation of whether we
            process your data and receive a copy of it.
          </li>
          <li>
            <strong>Rectification</strong> &mdash; correct inaccurate or
            incomplete data.
          </li>
          <li>
            <strong>Erasure</strong> &mdash; request deletion of your account
            and associated data (see section 10).
          </li>
          <li>
            <strong>Restriction and objection</strong> &mdash; ask us to limit
            processing, or object to processing based on legitimate interests.
          </li>
          <li>
            <strong>Data portability</strong> &mdash; receive your data in a
            structured, commonly used, machine-readable format.
          </li>
          <li>
            <strong>Withdraw consent</strong> &mdash; turn off location, photo,
            or notification permissions at any time in your device settings.
            Withdrawal does not affect processing carried out before withdrawal.
          </li>
          <li>
            <strong>Lodge a complaint</strong> &mdash; with the National Privacy
            Commission of the Philippines, or with your local data protection
            authority.
          </li>
        </ul>
        <p>
          To exercise any of these rights, email{' '}
          <a
            className="font-medium text-blue-600 underline underline-offset-2"
            href={`mailto:${CONTACT_EMAIL}`}
          >
            {CONTACT_EMAIL}
          </a>{' '}
          from the email address associated with your account. We will respond
          within 30 days. We may need to verify your identity before acting on a
          request, and we may decline requests that are manifestly unfounded,
          excessive, or that would infringe the rights of others.
        </p>
      </Section>

      <Section id="deletion" title="10. Deleting your account and data">
        <p>
          You can request deletion of your {APP_NAME} account and its associated
          personal data at any time:
        </p>
        <ol className="list-decimal space-y-1 pl-6">
          <li>
            Email{' '}
            <a
              className="font-medium text-blue-600 underline underline-offset-2"
              href={`mailto:${CONTACT_EMAIL}?subject=Account%20deletion%20request`}
            >
              {CONTACT_EMAIL}
            </a>{' '}
            from the email address on your account, with the subject{' '}
            <em>Account deletion request</em>.
          </li>
          <li>We will verify the request and confirm receipt.</li>
          <li>
            Your account, job posts, uploaded images, search history, near-me
            preferences, and device tokens are deleted within 30 days.
          </li>
        </ol>
        <p>
          <strong>What survives deletion.</strong> Messages you sent remain
          visible to the recipient, because a conversation is also their record.
          We may also retain a minimal record where retention is required by law
          or is necessary to resolve a dispute, prevent fraud, or enforce our
          Terms. Backups are purged on their normal rotation cycle, ordinarily
          within 90 days.
        </p>
        <p>
          Signing out of the app removes your session and this device&rsquo;s
          push token, but it does not delete your account.
        </p>
      </Section>

      <Section id="security" title="11. Security">
        <p>
          We use reasonable and appropriate organisational, physical, and
          technical measures to protect personal information, including
          encryption of data in transit (HTTPS/TLS), access controls on our
          databases and object storage, and authentication through Google rather
          than passwords we store ourselves.
        </p>
        <p>
          No method of transmission or storage is completely secure, and we
          cannot guarantee absolute security. If we become aware of a personal
          data breach that is likely to give rise to a real risk of serious harm,
          we will notify affected users and the relevant supervisory authority
          within the timeframes required by applicable law.
        </p>
        <p>
          Keep your Google account secure: anyone with access to it can access
          your {APP_NAME} account.
        </p>
      </Section>

      <Section id="children" title="12. Children">
        <p>
          The Service is not directed to children. You must be at least 18 years
          old to create an account and use {APP_NAME}. We do not knowingly
          collect personal information from anyone under 18. If we learn that we
          have collected such information, we will delete it and terminate the
          account. If you believe a minor is using the Service, contact us at{' '}
          <a
            className="font-medium text-blue-600 underline underline-offset-2"
            href={`mailto:${CONTACT_EMAIL}`}
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>

      <Section id="transfers" title="13. International data transfers">
        <p>
          {APP_NAME} is operated from the Philippines. Some of our service
          providers &mdash; notably Google &mdash; process data on servers
          located in other countries. Where personal data is transferred out of
          a jurisdiction that restricts such transfers, we rely on appropriate
          safeguards, such as the European Commission&rsquo;s Standard
          Contractual Clauses or an adequacy decision, and we require our
          providers to give the data an equivalent level of protection.
        </p>
      </Section>

      <Section id="regional" title="14. Regional disclosures">
        <h3 className="mt-6 text-lg font-semibold text-gray-900">
          Philippines
        </h3>
        <p>
          We process personal information in accordance with the Data Privacy
          Act of 2012 (RA 10173), its Implementing Rules and Regulations, and
          issuances of the National Privacy Commission. You may contact our
          privacy contact at {CONTACT_EMAIL}, and you have the right to file a
          complaint with the National Privacy Commission.
        </p>

        <h3 className="mt-6 text-lg font-semibold text-gray-900">
          European Economic Area and United Kingdom
        </h3>
        <p>
          If you are in the EEA or UK, the rights in section 9 apply to you
          under the GDPR/UK GDPR, and you may complain to your national
          supervisory authority.
        </p>

        <h3 className="mt-6 text-lg font-semibold text-gray-900">California</h3>
        <p>
          We do not sell or share personal information as those terms are
          defined by the California Consumer Privacy Act, and we have not done so
          in the preceding twelve months. California residents may exercise
          their rights to know, delete, and correct by contacting us at the email
          above. We will not discriminate against you for exercising these
          rights.
        </p>
      </Section>

      <Section id="third-party" title="15. Third-party links and services">
        <p>
          Job posts and messages may contain links to third-party websites or
          services. We do not control those destinations and are not responsible
          for their content or privacy practices. Review their privacy policies
          before providing them with information.
        </p>
      </Section>

      <Section id="changes" title="16. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. When we do, we
          will revise the &ldquo;Last updated&rdquo; date at the top of this
          page. If the changes are material, we will provide additional notice
          &mdash; for example, an in-app notice or an email &mdash; before the
          changes take effect. Continued use of the Service after the effective
          date constitutes acceptance of the revised policy.
        </p>
      </Section>

      <Section id="contact" title="17. Contact us">
        <p>
          Questions, requests, or complaints about this Privacy Policy or your
          personal information:
        </p>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
          <p className="font-semibold text-gray-900">{LEGAL_ENTITY}</p>
          <p className="mt-1 text-gray-700">{BUSINESS_ADDRESS}</p>
          <p className="mt-1">
            <a
              className="font-medium text-blue-600 underline underline-offset-2"
              href={`mailto:${CONTACT_EMAIL}`}
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </Section>

      <footer className="mt-16 border-t border-gray-200 pt-8 text-sm text-gray-500">
        <p>
          &copy; {new Date().getFullYear()} {LEGAL_ENTITY}. All rights reserved.
        </p>
      </footer>
    </main>
  );
}
