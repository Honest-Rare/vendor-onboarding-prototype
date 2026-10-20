import Link from 'next/link';
import { StorefrontShell } from '@/components/StorefrontShell';

const CRITERIA = [
  { title: 'Regional and manufactured', text: 'Drinks or food made by you, by producers based in the EU. Not just anything from anywhere.' },
  { title: 'Not mainstream', text: 'Your products are not widely available in national retail chains.' },
  { title: 'Focus on quality', text: 'Sophisticated, high-quality specialities instead of volume.' },
  { title: 'No bullshit', text: 'Only natural ingredients in your drinks and food.' },
];

export default function SellWithUsPage() {
  return (
    <StorefrontShell>
      <section className="hero">
        <div className="container">
          <h1>Sell your craft on Honest &amp; Rare</h1>
          <p>
            We bring regional spirits, beer, wine and food from independent EU producers to people who care how things are
            made. Every application is read by a person on our team.
          </p>
          <div className="row">
            <Link href="/apply" className="btn btn-primary">
              Apply to sell
            </Link>
            <a href="#how" className="btn">
              How it works
            </a>
          </div>
        </div>
      </section>

      <main className="container stack" style={{ gap: 40 }}>
        <section aria-labelledby="who">
          <h2 id="who">Who we look for</h2>
          <div className="grid-2 criteria">
            {CRITERIA.map((c) => (
              <div className="card" key={c.title}>
                <h3>{c.title}</h3>
                <p className="muted">{c.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="how" id="how" className="grid-2">
          <div className="card">
            <h2 id="how-title">From application to your shop going live</h2>
            <ol className="flow">
              <li>Apply in four short steps. No account needed yet.</li>
              <li>Confirm your email. We run some checks and our team reviews your application.</li>
              <li>We may ask you a question by email.</li>
              <li>If approved, you set a password and open your vendor panel.</li>
              <li>Set up payouts, legal details, shipping, your shop profile and a first product, in any order.</li>
              <li>We check each part. When everything is approved, you put your shop live.</li>
            </ol>
          </div>
          <div className="card">
            <h2>What to have at hand</h2>
            <ul>
              <li>Your VAT ID (or tax number for small businesses)</li>
              <li>Your website or social media page</li>
              <li>3 to 5 photos of your products, ideally one of a back label</li>
              <li>A few sentences about how you make your products</li>
            </ul>
            <p className="muted small">
              Bank details, ID documents and tax details come later, after approval. Bank details are entered on Stripe&apos;s
              secure pages, never with us.
            </p>
            <h3>Plans</h3>
            <p className="muted small">[Plan names, commission and limits to be confirmed]</p>
          </div>
        </section>
      </main>
    </StorefrontShell>
  );
}
