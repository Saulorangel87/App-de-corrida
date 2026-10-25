// English translation of the legal texts in legal.ts (Portuguese). Same sections and ids. Keep both in
// sync: whoever changes one changes the other in the same commit (and LEGAL_VERSION in legal.ts).
import { LEGAL_CONTACT_EMAIL, type LegalDocument } from "./legal";

export const LEGAL_UPDATED_LABEL_EN = "October 24, 2026";

export const PRIVACY_POLICY_EN: LegalDocument = {
  kicker: "PRIVACY",
  title: "Privacy Policy",
  intro:
    "This policy explains which data Let's Go Run keeps about you, what it uses each item for, who it is shared with and how you control it. It follows the Brazilian General Data Protection Law (LGPD, Law 13,709/2018).",
  sections: [
    {
      id: "responsavel",
      title: "Who is responsible for your data",
      paragraphs: [
        "Let's Go Run is developed and operated by Saulo Rangel, who decides how data is processed (the controller, under the LGPD).",
        `For any request or question about your data, write to ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
    {
      id: "dados",
      title: "Which data we collect",
      paragraphs: ["We collect only what you provide or generate while using the app:"],
      items: [
        "Account: name, email, password (kept only as an irreversible hash, never as text), chosen language and the dates the account was created and the email was confirmed.",
        "Profile: month and year of birth (we do not keep the day), sex, height and weight.",
        "Profile photo (optional): a thumbnail you upload. It is shrunk on your device before it is sent, is kept only to be shown to you in the app, and is deleted when you remove it or delete your account.",
        "Running history and routine: time spent running, workouts and volume per week, longest recent run, 5 km and 10 km times when you provide them, goal (distance and race date), weekly availability, usual sleep and stress, type of work, other sports, strength training and resources (heart rate watch, track, treadmill, type of terrain).",
        "Health, which is sensitive personal data: the Yes or No answers to the PAR-Q+ questionnaire, pregnancy, injuries and current pain, the screening result, the professional evaluation you declare (result, date and who evaluated; we do not ask for documents), pauses due to pain, injury or illness, and the notice of a change in health. We do not keep the free text of the PAR-Q+ (conditions and medications).",
        "Daily follow-up: check-ins (hours and quality of sleep, energy, mood, stress, muscle soreness, resting heart rate, acute illness, pain when walking), recorded pain (body location, intensity, type and associated symptoms) and your assessment of each 2-week block (whether it was easy, just right, hard, or you could not keep up).",
        "Workouts: plan, sessions, whether they were done, duration, distance, perceived effort and comment.",
        "App decisions: for each workout adjustment, we keep the rule applied and its version, so that you can see why the workout was kept, reduced or replaced with rest.",
        "Consent record: the date and version of the Terms of Use and the Privacy Policy you accepted, the consent to process health data and the declaration that you are 18 or older.",
        "Workout reminder (optional): if you turn it on, we keep the notification address the browser gives your device, the keys to encrypt the notice, the time you chose, the time zone and the last day the notice was sent. Turning the reminder off or logging out on that device deletes this data.",
        "Technical data: a session cookie; the browser and system of each open session (so you can recognize your devices); the language, in the browser's storage; and the IP address, used to limit attempts at improper access. The network and the server may record IP and time for security.",
      ],
    },
    {
      id: "finalidades",
      title: "What we use it for and the legal basis",
      items: [
        "Building and adjusting your workouts, recording your progress and showing the results: performance of the service you asked for (LGPD, art. 7, V).",
        "Processing your health data to make workouts safer (for example, reducing or suspending the load in the face of pain or poor sleep): your specific consent, given when you create the account and when you provide that data (art. 11, I). You can withdraw it at any time by deleting the account, since the workouts depend on that data.",
        "Keeping the service secure, limiting attempts at improper access and investigating abuse: legitimate interest (art. 7, IX).",
        "Complying with legal obligations, when applicable.",
      ],
      after: [
        "We do not use your data for advertising, we do not sell it and we do not build a commercial profile.",
        "Workouts are built by the app's planning rules, based on scientific studies cited in each workout. No artificial intelligence generates or changes your workouts. The rules can only keep or reduce the load; you decide whether to do, skip or log each session. If you want a review of an automated decision, ask through the contact above.",
        "Let's Go Run does not diagnose or treat medical conditions.",
      ],
    },
    {
      id: "compartilhamento",
      title: "Who we share it with",
      paragraphs: [
        "We use service providers (processors) that process data on our behalf and only for the agreed service:",
      ],
      items: [
        "Hosting: a cloud virtual server, where the application and the database are kept, and Cloudflare, which hosts the app's interface and carries traffic between your device and the server.",
        "Transactional email (Resend): receives your email, your name and the text of the email confirmation, password reset and security notice messages.",
        "Notifications (only if you turn on the workout reminder): your browser's notification service (Google, Apple, Mozilla or Microsoft, depending on the device) receives the encrypted notice to deliver it. The notice has generic text and no health data.",
        "Backup: copies of the database, encrypted before leaving the server, in external Oracle storage. Oracle keeps only the already-encrypted content.",
      ],
      after: [
        "The database and the backups are kept in Brazil. Cloudflare, Resend and, if you turn on the workout reminder, the browser's notification service may process data outside Brazil. In those cases, the transfer is necessary to provide the service (LGPD, art. 33, IX).",
        "We do not share your data with advertisers or with other users. We only disclose it to authorities when the law requires.",
      ],
    },
    {
      id: "retencao",
      title: "How long we keep it",
      items: [
        "Your data is kept while the account exists.",
        "When you delete the account in Settings, we erase all your data from the database immediately, without anyone's intervention.",
        "Backups made before the deletion remain encrypted for up to 30 days and are then discarded automatically. After that period, your data no longer exists in any copy.",
        "Technical access logs are kept for as long as needed for security.",
      ],
    },
    {
      id: "direitos",
      title: "Your rights",
      paragraphs: ["You can, at any time and free of charge (LGPD, art. 18):"],
      items: [
        'Confirm and access your data: in Settings, "Download my data" delivers a file with everything we keep about you, including health data.',
        "Correct data: by redoing the interview, and by resending a check-in or a workout log (the new one replaces the previous one).",
        "Take your data to another service: the downloaded file is JSON, an open format.",
        'Delete your data: in Settings, "Delete my account".',
        "Know who we share data with: in the section above.",
        "Withdraw consent and request a review of automated decisions: through the contact below.",
      ],
      after: [
        `For anything you cannot do yourself, write to ${LEGAL_CONTACT_EMAIL}. We answer within 15 days.`,
        "You can also file a complaint with the Brazilian National Data Protection Authority (ANPD), at gov.br/anpd.",
      ],
    },
    {
      id: "seguranca",
      title: "How we protect your data",
      items: [
        "Encrypted connection (HTTPS) between your device and the server.",
        "Passwords stored with an argon2id hash; the session cookie is HttpOnly, secure and protected against cross-site sending.",
        "Each account can only access its own data, with isolation also in the database; the database is not reachable from the internet.",
        "The session expires from inactivity and has a maximum lifetime; you can end open sessions on other devices.",
        "Limits on attempts at login, sign-up and password reset, with a temporary lock after several wrong passwords.",
        "Encrypted backups.",
      ],
      after: [
        "No system is completely secure. If an incident occurs that may cause you relevant risk or harm, we will notify you and the ANPD, as the law requires (art. 48).",
      ],
    },
    {
      id: "cookies",
      title: "Cookies and storage on your device",
      paragraphs: [
        "We use one essential cookie, which keeps you signed in. We keep in the browser's storage only the language you chose (Portuguese or English), which contains no personal data. We do not use advertising cookies or third-party analytics tools, nor do we load scripts, fonts or images from other sites.",
      ],
    },
    {
      id: "menores",
      title: "Children and teenagers",
      paragraphs: [
        "Let's Go Run is intended for people aged 18 or older. If we identify an account of a minor, we will delete the data.",
      ],
    },
    {
      id: "mudancas",
      title: "Changes to this policy",
      paragraphs: [
        "When we change something that affects your data, such as a new provider or a new type of data, we update this page and the date at the top, and we notify you in the app before the change takes effect. A new use that requires new data only starts with your consent.",
      ],
    },
  ],
};

export const TERMS_OF_USE_EN: LegalDocument = {
  kicker: "TERMS",
  title: "Terms of Use",
  intro:
    "These terms apply to the use of Let's Go Run, a running training planning app. By creating an account, you declare that you have read and agree to them and to the Privacy Policy.",
  sections: [
    {
      id: "elegibilidade",
      title: "Who can use it",
      paragraphs: [
        "Let's Go Run is intended for people aged 18 or older. The account is personal and you must provide truthful information.",
      ],
    },
    {
      id: "servico",
      title: "What Let's Go Run is, and what it is not",
      paragraphs: [
        "Let's Go Run suggests running workouts based on your profile, your routine, your health screening and your records. It is not a medical, physiotherapy or nutrition service, it does not diagnose and it does not replace the guidance of health or physical education professionals.",
        "Before starting or increasing your training load, especially if you have an illness, injury, medical restriction or recent surgery, consult a professional. Stop training in the face of pain that does not go away, dizziness, unusual shortness of breath or any discomfort. In an emergency (chest pain that does not go away, fainting or severe shortness of breath), call 192 (SAMU). You decide whether to do each workout and how to do it, and you are responsible for that decision.",
      ],
    },
    {
      id: "triagem",
      title: "Health screening",
      paragraphs: [
        "The app only builds workouts after the health screening (the PAR-Q+ questionnaire). Depending on your answers, it asks you to see a professional before training, and no workouts are generated until then.",
      ],
      items: [
        "If you declare a professional evaluation, the app records your declaration, without asking for documents, and you are responsible for the truthfulness of what you declared.",
        "If your health changes (a new diagnosis, medication, injury, pregnancy or hospital stay), tell us when the app asks or in Settings. The clearance stops being valid and you redo the screening.",
        "The screening has an expiry date and must be redone when it expires.",
      ],
      after: [
        "The PAR-Q+ was created by the PAR-Q+ Collaboration (© PAR-Q+ Collaboration; translated by Bianca Bold and Juliano Schwartz) and appears unchanged, for free and non-commercial use.",
      ],
    },
    {
      id: "conta",
      title: "Your account",
      items: [
        "Keep your password safe and do not share it. You are responsible for what happens in your account.",
        'Let us know if you suspect improper access. In Settings, you can end open sessions on other devices; to change your password, use "Forgot my password" on the sign-in screen.',
        "You can delete the account at any time, in Settings, and your data is erased.",
      ],
    },
    {
      id: "uso-adequado",
      title: "Proper use",
      paragraphs: ["It is not allowed to:"],
      items: [
        "try to access other accounts' data or get around the app's security;",
        "overload the service or use automated means that harm other users;",
        "send text that is illegal, offensive or not yours.",
      ],
      after: ["We may suspend accounts that violate these rules."],
    },
    {
      id: "seus-dados",
      title: "Your data and content",
      paragraphs: [
        "The data you submit remains yours. You authorize us to process it only to operate Let's Go Run for you, as described in the Privacy Policy.",
      ],
    },
    {
      id: "ciencia",
      title: "Workouts, rules and scientific basis",
      paragraphs: [
        "Workouts come from the app's planning rules, based on studies cited in each workout. No artificial intelligence generates or changes the workouts.",
        "The studies give a general basis for training principles. When a value is an initial choice of the app, without a direct study, the app says so. Studies of population groups do not guarantee the same result for you.",
      ],
    },
    {
      id: "gratuidade",
      title: "Free of charge",
      paragraphs: ["Let's Go Run is free. If that changes one day, we will update these terms and let you know in advance."],
    },
    {
      id: "disponibilidade",
      title: "Availability and changes",
      paragraphs: [
        "Let's Go Run is evolving and is provided as is. It may be unavailable for maintenance or because of a failure, and features may change or be removed. We will do our best to warn you before changes that affect your data.",
      ],
    },
    {
      id: "responsabilidade",
      title: "Liability",
      paragraphs: [
        "To the extent the law allows, Let's Go Run does not guarantee performance or health results, and is not liable for injuries, damages or losses arising from the workout you decided to do. Nothing here removes rights that the law grants you, including those of the Brazilian Consumer Protection Code.",
      ],
    },
    {
      id: "lei",
      title: "Governing law",
      paragraphs: ["The laws of Brazil apply. If you are a consumer, the venue is that of your place of residence."],
    },
    {
      id: "mudancas",
      title: "Changes and contact",
      paragraphs: [
        `We may update these terms; the date at the top shows the version in force, and we notify you in the app when a change is relevant. Questions: ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
  ],
};
