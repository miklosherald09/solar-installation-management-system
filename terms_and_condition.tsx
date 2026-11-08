/**
 * Terms and Conditions — Solar Installation Management System
 *
 * Drop-in page for a Next.js app.
 *   App Router:   app/terms-and-conditions/page.tsx
 *   Pages Router: pages/terms-and-conditions.tsx  (the `metadata` export is ignored there)
 *
 * Styling uses Tailwind utility classes. No client-side hooks, so this stays a
 * React Server Component.
 *
 * BEFORE PUBLISHING: fill in LEGAL_ENTITY, BUSINESS_ADDRESS, and GOVERNING_VENUE.
 * Section 19 contains the Apple-required "minimum terms" for App Store
 * distribution — do not delete it if you ship on iOS.
 */

export const metadata = {
  title: 'Terms and Conditions — Solar Installation Management System',
  description:
    'The agreement between you and Solar Installation Management System governing use of the app.',
};

const APP_NAME = 'Solar Installation Management System';
const CONTACT_EMAIL = 'service@solarimsys.online';
const EFFECTIVE_DATE = 'August 5, 2026';
const LAST_UPDATED = 'August 5, 2026';

// TODO: replace with your registered business name, address, and preferred venue.
const LEGAL_ENTITY = 'Solar Installation Management System';
const BUSINESS_ADDRESS = '[Registered business address], Philippines';
const GOVERNING_LAW = 'the Republic of the Philippines';
const GOVERNING_VENUE = '[City], Philippines';

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

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 rounded-lg bg-amber-50 p-5 text-[15px] leading-7 text-amber-900 ring-1 ring-amber-200">
      {children}
    </div>
  );
}

export default function TermsAndConditions() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="border-b border-gray-200 pb-8">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Terms and Conditions
        </h1>
        <p className="mt-3 text-sm text-gray-500">
          Effective date: {EFFECTIVE_DATE} &middot; Last updated: {LAST_UPDATED}
        </p>
      </header>

      <div className="mt-8 space-y-4 text-[15px] leading-7 text-gray-700">
        <p>
          These Terms and Conditions (the &ldquo;Terms&rdquo;) form a binding
          agreement between you and {LEGAL_ENTITY} (&ldquo;{APP_NAME},&rdquo;
          &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) governing
          your access to and use of the {APP_NAME} mobile application and any
          related services (the &ldquo;Service&rdquo;).
        </p>
        <Callout>
          <strong>Please read these Terms carefully.</strong> By creating an
          account, or by accessing or using the Service, you agree to be bound
          by these Terms and by our Privacy Policy. If you do not agree, do not
          use the Service. Sections 14 to 17 limit our liability and affect your
          legal rights.
        </Callout>
      </div>

      <Section id="service" title="1. What Solar Installation Management System is">
        <p>
          {APP_NAME} is a community marketplace that connects people who need
          everyday work done &mdash; such as cleaning, gardening, pet sitting,
          car washing, repairs, moving, painting, construction, and driving
          &mdash; with people willing to do that work.
        </p>
        <Callout>
          <strong>We are a venue, not a party to your arrangement.</strong>{' '}
          {APP_NAME} does not perform work, does not employ or engage workers,
          is not a staffing agency, recruiter, contractor, or employment agency,
          and is not a party to any agreement between a job poster and a worker.
          Any job, price, schedule, payment, or other arrangement is made
          directly between the users involved, entirely at their own risk and
          responsibility.
        </Callout>
        <p>
          We do not screen, interview, verify, background-check, licence-check,
          insure, supervise, or endorse any user, job posting, or the quality,
          safety, or legality of any work performed. Any references in the app
          to a user, a job, or a budget are user-generated content, not our
          representations.
        </p>
      </Section>

      <Section id="eligibility" title="2. Eligibility">
        <p>To use the Service you must:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>be at least 18 years old;</li>
          <li>
            have the legal capacity to enter into a binding contract in your
            jurisdiction;
          </li>
          <li>
            not be barred from using the Service under any applicable law, and
            not have been previously removed from the Service by us;
          </li>
          <li>
            hold all licences, permits, registrations, and insurance required by
            law for any work you offer to perform.
          </li>
        </ul>
        <p>
          By using the Service you represent and warrant that you meet all of
          these requirements.
        </p>
      </Section>

      <Section id="accounts" title="3. Your account">
        <p>
          Accounts are created by signing in with Google. You are responsible for
          maintaining the security of the Google account you use, and for all
          activity that occurs under your {APP_NAME} account.
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            Provide accurate, current, and complete information, and keep it up
            to date.
          </li>
          <li>
            Do not create an account for anyone else, impersonate any person or
            entity, or misrepresent your affiliation with any person or entity.
          </li>
          <li>
            Do not maintain more than one account without our written
            permission, and do not create a new account to evade a suspension.
          </li>
          <li>
            Do not sell, transfer, or license your account to anyone else.
          </li>
          <li>
            Notify us immediately at {CONTACT_EMAIL} if you suspect unauthorised
            use of your account.
          </li>
        </ul>
      </Section>

      <Section id="content" title="4. Your content">
        <p>
          &ldquo;User Content&rdquo; means anything you submit through the
          Service: job postings and their descriptions, categories, budgets,
          locations, contact phone numbers, dates and tags; photos and images
          you upload; messages you send; search terms; and any other material.
        </p>

        <h3 className="mt-8 text-lg font-semibold text-gray-900">
          4.1 You remain the owner
        </h3>
        <p>
          You retain all ownership rights in your User Content. These Terms do
          not transfer ownership to us.
        </p>

        <h3 className="mt-8 text-lg font-semibold text-gray-900">
          4.2 Licence you grant us
        </h3>
        <p>
          You grant {APP_NAME} a worldwide, non-exclusive, royalty-free,
          sublicensable, transferable licence to host, store, reproduce, adapt
          (for formatting and resizing), publish, publicly display, and
          distribute your User Content, solely for the purposes of operating,
          providing, securing, and promoting the Service. This licence ends when
          you delete the User Content or your account, except that (a) copies
          may persist in backups for a limited period, and (b) messages you sent
          remain available to their recipients.
        </p>

        <h3 className="mt-8 text-lg font-semibold text-gray-900">
          4.3 Your warranties
        </h3>
        <p>You represent and warrant that, for all User Content you submit:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            you own it or have all rights and permissions necessary to submit it
            and to grant the licence above;
          </li>
          <li>
            it does not infringe any copyright, trademark, privacy, publicity,
            or other right of any person;
          </li>
          <li>
            it is accurate, and it is not fraudulent, misleading, or deceptive;
          </li>
          <li>
            you have obtained the consent of any identifiable person appearing in
            a photo you upload;
          </li>
          <li>it complies with all applicable laws.</li>
        </ul>

        <h3 className="mt-8 text-lg font-semibold text-gray-900">
          4.4 Public content
        </h3>
        <p>
          Job postings are public within the app. Anything you include &mdash;
          including the address and the contact phone number you enter &mdash;
          is visible to other users. Do not post identity documents, financial
          account details, or other sensitive information.
        </p>

        <h3 className="mt-8 text-lg font-semibold text-gray-900">
          4.5 Moderation
        </h3>
        <p>
          We are not obliged to monitor User Content, but we may review, refuse,
          edit, restrict access to, or remove any User Content at any time, with
          or without notice, if we reasonably believe it violates these Terms or
          applicable law, or is otherwise harmful to users or to us.
        </p>
      </Section>

      <Section id="conduct" title="5. Prohibited conduct">
        <p>You agree not to, and not to allow anyone else to:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            post a job or offer services that are illegal, or that involve
            illegal drugs, weapons, sexual services, gambling, trafficking, or
            any unlawful activity;
          </li>
          <li>
            post content that is fraudulent, misleading, a scam, a pyramid or
            multi-level marketing scheme, a fake listing, or an advance-fee
            request;
          </li>
          <li>
            harass, threaten, defame, stalk, bully, or discriminate against any
            person, including on the basis of race, ethnicity, national origin,
            religion, sex, gender identity, sexual orientation, age, disability,
            or any other protected characteristic;
          </li>
          <li>
            post sexually explicit content, hate speech, graphic violence, or
            content that exploits or endangers minors;
          </li>
          <li>
            send spam, chain messages, unsolicited advertising, or bulk
            solicitations through the messaging feature;
          </li>
          <li>
            collect, scrape, harvest, or store other users&rsquo; personal
            information, or use it for any purpose other than communicating
            about the specific job at hand;
          </li>
          <li>
            use automated means &mdash; bots, crawlers, scripts &mdash; to
            access, scrape, or interact with the Service, or attempt to
            circumvent rate limits;
          </li>
          <li>
            reverse engineer, decompile, disassemble, or attempt to derive the
            source code of the Service, except to the extent this restriction is
            prohibited by law;
          </li>
          <li>
            probe, scan, or test the vulnerability of the Service, breach or
            circumvent any security or authentication measure, or access data
            not intended for you;
          </li>
          <li>
            interfere with or disrupt the Service, its servers, or its networks,
            including by overloading, flooding, or denial-of-service;
          </li>
          <li>
            upload viruses, malware, or any other harmful code;
          </li>
          <li>
            infringe anyone&rsquo;s intellectual property rights, or remove any
            proprietary notices;
          </li>
          <li>
            use the Service to compete with us, to build a similar or competing
            product, or to reproduce any portion of it;
          </li>
          <li>
            engage in off-platform arrangements designed to evade these Terms,
            or encourage anyone else to violate them.
          </li>
        </ul>
        <p>
          You may report violations to{' '}
          <a
            className="font-medium text-blue-600 underline underline-offset-2"
            href={`mailto:${CONTACT_EMAIL}?subject=Report%20a%20violation`}
          >
            {CONTACT_EMAIL}
          </a>
          . We review reports and act at our discretion.
        </p>
      </Section>

      <Section id="transactions" title="6. Transactions between users">
        <p>
          Budgets shown in the app are amounts stated by users. {APP_NAME} does
          not process payments, does not hold funds in escrow, does not
          guarantee payment, and takes no commission on any job.
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            You and the other user are solely responsible for negotiating,
            agreeing, and performing the terms of any job, including scope,
            price, schedule, materials, and method of payment.
          </li>
          <li>
            All payments are settled directly between users, outside the
            Service. We have no visibility into them and no ability to reverse,
            refund, or mediate them.
          </li>
          <li>
            You are solely responsible for determining, reporting, and paying any
            taxes, contributions, permits, licences, or insurance arising from
            your activity, and for complying with all labour, tax, and business
            registration laws that apply to you.
          </li>
          <li>
            Any dispute about a job &mdash; quality, payment, damage, delay, or
            anything else &mdash; is between the users involved. We are not
            obliged to mediate, arbitrate, or resolve it, though we may
            investigate reports of Terms violations.
          </li>
        </ul>
      </Section>

      <Section id="safety" title="7. Safety">
        <Callout>
          <strong>Use good judgement.</strong> {APP_NAME} connects you with
          strangers. We do not verify identity, run background checks, confirm
          qualifications, or vet job postings. You interact with other users
          entirely at your own risk.
        </Callout>
        <p>Some sensible precautions:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            Meet in a public place first where practical, and tell someone you
            trust where you are going.
          </li>
          <li>
            Be wary of anyone asking for money up front, for deposits, for gift
            cards, or for your bank or e-wallet credentials.
          </li>
          <li>
            Do not share identity documents, one-time passwords, or account
            credentials with other users.
          </li>
          <li>
            Confirm licences, permits, and insurance yourself for any work that
            requires them.
          </li>
          <li>
            Trust your instincts. Stop the interaction and report the user if
            something feels wrong.
          </li>
        </ul>
        <p>
          If you believe you are in immediate danger, contact your local
          emergency services first, then report the user to us.
        </p>
      </Section>

      <Section id="permissions" title="8. Device permissions and notifications">
        <p>
          Certain features ask for your permission to use device capabilities:
          precise location (to fill in a job address or to use the
          &ldquo;Near me&rdquo; filter), your photo library (to attach images to
          a posting), and notifications (to alert you to messages and to interest
          in your jobs). You may grant or revoke these permissions at any time in
          your device settings; some features will not work without them. Our
          handling of the resulting data is described in our Privacy Policy.
        </p>
        <p>
          Standard carrier data rates may apply to your use of the Service. You
          are responsible for your own device, connectivity, and their costs.
        </p>
      </Section>

      <Section id="fees" title="9. Fees">
        <p>
          The Service is currently provided free of charge. We reserve the right
          to introduce fees, subscriptions, or paid features in the future. If we
          do, we will give you reasonable advance notice and you will not be
          charged for any paid feature without your express consent. Any future
          purchases made through the Apple App Store or Google Play will also be
          subject to that store&rsquo;s payment terms.
        </p>
      </Section>

      <Section id="ip" title="10. Our intellectual property">
        <p>
          The Service, including its software, source code, design, user
          interface, graphics, icons, illustrations, text, and the {APP_NAME}{' '}
          name and logo, is owned by {LEGAL_ENTITY} or its licensors and is
          protected by intellectual property laws.
        </p>
        <p>
          Subject to your compliance with these Terms, we grant you a limited,
          personal, non-exclusive, non-transferable, non-sublicensable, revocable
          licence to install and use the app on a device you own or control, for
          your own personal, non-commercial use of the Service. All rights not
          expressly granted are reserved. You may not copy, modify, distribute,
          sell, lease, or create derivative works from any part of the Service.
        </p>
        <p>
          If you send us feedback or suggestions, you grant us an unrestricted,
          perpetual, irrevocable, royalty-free right to use them for any purpose
          without obligation to you.
        </p>
      </Section>

      <Section id="ip-claims" title="11. Copyright and intellectual property claims">
        <p>
          If you believe content on the Service infringes your intellectual
          property rights, email{' '}
          <a
            className="font-medium text-blue-600 underline underline-offset-2"
            href={`mailto:${CONTACT_EMAIL}?subject=IP%20infringement%20notice`}
          >
            {CONTACT_EMAIL}
          </a>{' '}
          with: (a) identification of the work you claim is infringed; (b)
          identification of the material on the Service and enough detail for us
          to locate it; (c) your contact details; (d) a statement that you have a
          good-faith belief the use is not authorised by the rights holder or the
          law; (e) a statement, under penalty of perjury, that the information is
          accurate and that you are the rights holder or authorised to act on
          their behalf; and (f) your physical or electronic signature.
        </p>
        <p>
          We will investigate and may remove the material. We may terminate the
          accounts of repeat infringers.
        </p>
      </Section>

      <Section id="third-party" title="12. Third-party services">
        <p>
          The Service relies on third-party services, including Google Sign-In,
          Firebase Cloud Messaging, Google Maps, and the OpenStreetMap Nominatim
          geocoding service. Your use of those services is subject to their own
          terms and policies. We are not responsible for third-party services, and
          their availability, accuracy, or continued operation is outside our
          control. Map data, addresses, and distances shown in the app are
          provided by third parties and may be inaccurate or out of date.
        </p>
        <p>
          User Content may link to external websites. We do not control or endorse
          them and are not responsible for their content.
        </p>
      </Section>

      <Section id="availability" title="13. Availability and changes to the Service">
        <p>
          We may modify, suspend, or discontinue any part of the Service at any
          time, with or without notice. We may impose limits on features or
          restrict access to parts of the Service. We do not warrant that the
          Service will be uninterrupted, timely, secure, or error-free, and we
          are not liable for any unavailability, data loss, or failure to deliver
          a message or notification.
        </p>
        <p>
          We may release updates to the app. Some updates may be required for
          continued use, and older versions may stop working.
        </p>
      </Section>

      <Section id="termination" title="14. Suspension and termination">
        <p>
          You may stop using the Service at any time, and you may request
          deletion of your account by emailing {CONTACT_EMAIL} as described in
          our Privacy Policy.
        </p>
        <p>
          We may suspend or terminate your account or access to the Service at any
          time, with or without notice, if we reasonably believe you have violated
          these Terms or applicable law, if your conduct risks harm to other users
          or to us, or if we discontinue the Service. Where practical and lawful,
          we will give you notice and an opportunity to respond.
        </p>
        <p>
          On termination, your licence to use the Service ends immediately.
          Sections 4.2 (to the extent stated), 6, 10, 11, and 14 to 21 survive
          termination.
        </p>
      </Section>

      <Section id="disclaimer" title="15. Disclaimer of warranties">
        <p className="font-medium uppercase tracking-wide text-gray-900">
          To the maximum extent permitted by law:
        </p>
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as
          available,&rdquo; without warranty of any kind, whether express,
          implied, or statutory. We expressly disclaim all implied warranties of
          merchantability, fitness for a particular purpose, title, accuracy, and
          non-infringement.
        </p>
        <p>
          We make no warranty that: the Service will meet your requirements; it
          will be uninterrupted, secure, or error-free; any information obtained
          through it is accurate or reliable; any user is who they claim to be or
          is trustworthy, skilled, qualified, licensed, insured, or safe; any job
          posting is genuine; or any job will be completed, or completed to a
          given standard, or paid for.
        </p>
        <p>
          Some jurisdictions do not allow the exclusion of certain warranties, so
          some of the above may not apply to you. Nothing in these Terms excludes
          rights you have under mandatory consumer protection law, including the
          Philippine Consumer Act.
        </p>
      </Section>

      <Section id="liability" title="16. Limitation of liability">
        <p className="font-medium uppercase tracking-wide text-gray-900">
          To the maximum extent permitted by law:
        </p>
        <p>
          {LEGAL_ENTITY}, its officers, directors, employees, contractors, and
          agents will not be liable for any indirect, incidental, special,
          consequential, exemplary, or punitive damages, or for any loss of
          profits, revenue, goodwill, data, or business opportunity, arising out
          of or relating to your use of, or inability to use, the Service &mdash;
          whether based in contract, tort, negligence, strict liability, or any
          other theory, and even if we have been advised of the possibility of
          such damages.
        </p>
        <p>
          In particular, we are not liable for: the conduct of any user, whether
          online or offline; any injury, death, property damage, theft, loss, or
          harm arising from an interaction or job arranged through the Service;
          any failure to pay, underpayment, non-performance, or defective work;
          the accuracy or completeness of any User Content; or unauthorised access
          to your data resulting from causes beyond our reasonable control.
        </p>
        <p>
          Our total aggregate liability for all claims relating to the Service
          will not exceed the greater of (a) the total amount you paid us in the
          twelve months before the event giving rise to the claim, or (b) one
          thousand Philippine pesos (₱1,000).
        </p>
        <p>
          Nothing in this section limits liability that cannot be limited by law,
          including liability for death or personal injury caused by our
          negligence, or for our fraud or wilful misconduct.
        </p>
      </Section>

      <Section id="indemnity" title="17. Indemnification">
        <p>
          You agree to indemnify, defend, and hold harmless {LEGAL_ENTITY} and its
          officers, directors, employees, contractors, and agents from and against
          any claims, demands, damages, losses, liabilities, costs, and expenses
          (including reasonable legal fees) arising out of or related to: your use
          of the Service; your User Content; your interaction, arrangement, or
          dispute with another user; your breach of these Terms or of any law; or
          your violation of any third party&rsquo;s rights.
        </p>
        <p>
          We reserve the right to assume the exclusive defence and control of any
          matter subject to indemnification by you, at your expense, and you agree
          to cooperate with our defence.
        </p>
      </Section>

      <Section id="disputes" title="18. Disputes between users">
        <p>
          If you have a dispute with another user, you resolve it directly with
          them. You release {LEGAL_ENTITY} and its officers, directors, employees,
          and agents from all claims, demands, and damages of every kind, known
          and unknown, arising out of or in any way connected with such disputes.
        </p>
      </Section>

      <Section id="app-stores" title="19. App store terms">
        <h3 className="mt-6 text-lg font-semibold text-gray-900">
          19.1 Apple App Store
        </h3>
        <p>
          If you downloaded the app from the Apple App Store, the following
          applies and prevails over any conflicting provision of these Terms:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            These Terms are between you and {LEGAL_ENTITY} only, not with Apple
            Inc. (&ldquo;Apple&rdquo;). {APP_NAME}, not Apple, is solely
            responsible for the app and its content.
          </li>
          <li>
            Your licence to use the app is limited to a non-transferable licence
            to use it on any Apple-branded product that you own or control, as
            permitted by the Usage Rules in the Apple Media Services Terms and
            Conditions.
          </li>
          <li>
            Apple has no obligation to furnish any maintenance or support services
            for the app.
          </li>
          <li>
            If the app fails to conform to any applicable warranty, you may notify
            Apple, and Apple will refund the purchase price (if any). To the
            maximum extent permitted by law, Apple has no other warranty
            obligation with respect to the app, and any other claims, losses,
            liabilities, damages, costs, or expenses attributable to a failure to
            conform to a warranty are our responsibility.
          </li>
          <li>
            Apple is not responsible for addressing any claim by you or a third
            party relating to the app or your possession or use of it, including
            product liability claims, any claim that the app fails to conform to a
            legal or regulatory requirement, and claims under consumer protection
            or similar legislation.
          </li>
          <li>
            In the event of a third-party claim that the app or your use of it
            infringes intellectual property rights, {LEGAL_ENTITY}, not Apple, is
            solely responsible for the investigation, defence, settlement, and
            discharge of that claim.
          </li>
          <li>
            You represent that you are not located in a country subject to a U.S.
            Government embargo or designated as a &ldquo;terrorist
            supporting&rdquo; country, and that you are not on any U.S. Government
            list of prohibited or restricted parties.
          </li>
          <li>
            Apple and its subsidiaries are third-party beneficiaries of these
            Terms, and upon your acceptance Apple has the right (and is deemed to
            have accepted the right) to enforce these Terms against you as a
            third-party beneficiary.
          </li>
          <li>
            Questions, complaints, or claims about the app should be directed to{' '}
            {CONTACT_EMAIL}.
          </li>
        </ul>

        <h3 className="mt-8 text-lg font-semibold text-gray-900">
          19.2 Google Play
        </h3>
        <p>
          If you downloaded the app from Google Play, your use is also subject to
          the Google Play Terms of Service. Google is not a party to these Terms
          and is not responsible for the app.
        </p>
      </Section>

      <Section id="governing-law" title="20. Governing law and dispute resolution">
        <p>
          These Terms and any dispute arising out of or relating to them or to the
          Service are governed by the laws of {GOVERNING_LAW}, without regard to
          its conflict-of-laws rules.
        </p>
        <p>
          Before filing a claim, you agree to first contact us at {CONTACT_EMAIL}{' '}
          and attempt to resolve the dispute informally in good faith for at least
          thirty (30) days.
        </p>
        <p>
          If the dispute is not resolved informally, you and {LEGAL_ENTITY} agree
          to the exclusive jurisdiction of the competent courts of{' '}
          {GOVERNING_VENUE}, and each party waives any objection to venue there.
          This does not deprive you of the protection of any mandatory consumer
          law of your country of residence, nor of your right to bring proceedings
          in your local courts where that right cannot be excluded.
        </p>
      </Section>

      <Section id="general" title="21. General terms">
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Entire agreement.</strong> These Terms and the Privacy Policy
            are the entire agreement between you and us regarding the Service and
            supersede any prior agreement on that subject.
          </li>
          <li>
            <strong>Severability.</strong> If any provision is held invalid or
            unenforceable, it will be limited or removed to the minimum extent
            necessary and the remaining provisions stay in full force.
          </li>
          <li>
            <strong>No waiver.</strong> Our failure to enforce any provision is
            not a waiver of our right to do so later.
          </li>
          <li>
            <strong>Assignment.</strong> You may not assign or transfer these
            Terms without our prior written consent. We may assign them to an
            affiliate or in connection with a merger, acquisition, or sale of
            assets.
          </li>
          <li>
            <strong>No agency.</strong> Nothing in these Terms creates a
            partnership, joint venture, agency, franchise, or employment
            relationship between you and {LEGAL_ENTITY}.
          </li>
          <li>
            <strong>Force majeure.</strong> We are not liable for any failure or
            delay caused by events beyond our reasonable control, including acts
            of nature, typhoons, earthquakes, power or internet failures,
            government action, labour disputes, or third-party service outages.
          </li>
          <li>
            <strong>Notices.</strong> We may give notice by email to the address
            on your account, or by in-app notice. You may give notice to us at{' '}
            {CONTACT_EMAIL}.
          </li>
          <li>
            <strong>Language.</strong> These Terms are drawn up in English. Any
            translation is provided for convenience; the English version prevails
            in the event of conflict.
          </li>
        </ul>
      </Section>

      <Section id="changes" title="22. Changes to these Terms">
        <p>
          We may update these Terms from time to time. When we do, we will revise
          the &ldquo;Last updated&rdquo; date above. If the changes are material,
          we will give you reasonable advance notice &mdash; for example, an
          in-app notice or an email &mdash; before they take effect. Your
          continued use of the Service after the effective date means you accept
          the revised Terms. If you do not accept them, stop using the Service and
          request deletion of your account.
        </p>
      </Section>

      <Section id="contact" title="23. Contact us">
        <p>Questions about these Terms:</p>
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
