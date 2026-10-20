// Plain-text emails. English only for now; German is switched off until texts exist.

export interface Email {
  subject: string;
  text: string;
}

const sign = '\n\nHonest & Rare\nhonest-rare.de';

export const templates = {
  confirmEmail: (p: { name: string; link: string }): Email => ({
    subject: 'Please confirm your email to send your application',
    text:
      `Hello ${p.name},\n\nthank you for applying to sell on Honest & Rare.\n\n` +
      `Please confirm your email address so we can review your application:\n${p.link}\n\n` +
      `The link works once and expires in 3 days.` +
      sign,
  }),

  applicationReceived: (p: { name: string; shopName: string }): Email => ({
    subject: `We have received your application for ${p.shopName}`,
    text:
      `Hello ${p.name},\n\nyour email is confirmed and your application is now with our team.\n\n` +
      `What happens next: a member of our team reviews every application personally. ` +
      `We may ask you a question by email. If you are approved, you receive a link to set up your vendor account.` +
      sign,
  }),

  adminNewApplication: (p: { shopName: string; link: string }): Email => ({
    subject: `New vendor application: ${p.shopName}`,
    text: `A new application is ready for review once the checks finish:\n${p.link}`,
  }),

  needsInfo: (p: { name: string; question: string; link: string }): Email => ({
    subject: 'A question about your Honest & Rare application',
    text:
      `Hello ${p.name},\n\nwe are reviewing your application and need a little more information:\n\n` +
      `"${p.question}"\n\nPlease answer here:\n${p.link}\n\nThe link works once and expires in 14 days.` +
      sign,
  }),

  adminAnswerReceived: (p: { shopName: string; link: string }): Email => ({
    subject: `${p.shopName} answered your question`,
    text: `The application is back in the review queue:\n${p.link}`,
  }),

  approved: (p: { name: string; shopName: string; link: string }): Email => ({
    subject: `Welcome to Honest & Rare, ${p.shopName}`,
    text:
      `Hello ${p.name},\n\ngood news: your application is approved.\n\n` +
      `Set your password to open your vendor panel:\n${p.link}\n\n` +
      `In the vendor panel you will set up payouts, legal and tax details, shipping, your shop profile and your first product. ` +
      `Our team checks each section before your shop goes live.\n\nThe link works once and expires in 3 days.` +
      sign,
  }),

  rejected: (p: { name: string; message: string }): Email => ({
    subject: 'Your Honest & Rare application',
    text: `Hello ${p.name},\n\n${p.message}` + sign,
  }),

  sectionChangesRequested: (p: { name: string; section: string; note: string; link: string }): Email => ({
    subject: `Please update "${p.section}" in your vendor panel`,
    text: `Hello ${p.name},\n\nwe checked "${p.section}" and need a change:\n\n"${p.note}"\n\nUpdate it here:\n${p.link}` + sign,
  }),

  readyToGoLive: (p: { name: string; link: string }): Email => ({
    subject: 'Your shop is ready to go live',
    text: `Hello ${p.name},\n\nall sections are approved. You can now put your shop live from your vendor panel:\n${p.link}` + sign,
  }),

  live: (p: { name: string; shopName: string }): Email => ({
    subject: `${p.shopName} is live on Honest & Rare`,
    text: `Hello ${p.name},\n\nyour shop is now visible to customers. Welcome aboard.` + sign,
  }),
};
