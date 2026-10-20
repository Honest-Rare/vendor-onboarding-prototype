import type { ScreeningResult } from './screening.types.js';

type Scripted = Omit<ScreeningResult, 'provider' | 'model' | 'promptVersion' | 'simulated'>;

/**
 * Pre-written screening results for the fictional test applications created by the seed script.
 * They show what the real AI is expected to return. Names and websites are invented.
 */
export const SCRIPTED_RESULTS: Record<string, Scripted> = {
  kellerwald: {
    recommendation: 'approve',
    confidence: 0.86,
    summary:
      'Small family distillery in Hesse distilling fruit brandies and gin from its own orchards. ' +
      'Website and story match; no sign of mainstream retail. Spirits seller, so alcohol tax status is needed after approval.',
    criteria: [
      { criterion: 'regional', assessment: 'evidence_found', note: 'Distils on site in Kellerwald, Hesse; fruit from own orchards.', source: 'https://kellerwald-brennerei.example/about' },
      { criterion: 'not_mainstream', assessment: 'evidence_found', note: 'Sold at the farm shop and two regional markets only.', source: 'application' },
      { criterion: 'quality', assessment: 'evidence_found', note: 'Small batches, numbered bottles, regional spirits awards mentioned.', source: 'https://kellerwald-brennerei.example/about' },
      { criterion: 'natural', assessment: 'evidence_found', note: '"No added flavourings or sugar" stated on the gin page.', source: 'https://kellerwald-brennerei.example/gin' },
    ],
    flags: [{ severity: 'info', title: 'Spirits', detail: 'Needs alcohol tax status and 18+ delivery during setup.', source: 'application' }],
    sourcesChecked: ['https://kellerwald-brennerei.example', 'https://kellerwald-brennerei.example/about', 'https://kellerwald-brennerei.example/gin'],
  },

  collinaverde: {
    recommendation: 'approve',
    confidence: 0.74,
    summary:
      'Organic-certified family winery in Piedmont making about 12,000 bottles a year. Strong fit; ' +
      'the website lists no ingredients, which is normal for wine. Organic claim needs the certificate during setup.',
    criteria: [
      { criterion: 'regional', assessment: 'evidence_found', note: 'Own vineyards near Alba, Piedmont (Italy).', source: 'https://collinaverde.example' },
      { criterion: 'not_mainstream', assessment: 'evidence_found', note: 'Sold through the cellar door and a few wine bars in Turin.', source: 'application' },
      { criterion: 'quality', assessment: 'evidence_found', note: 'Hand-harvested, about 12,000 bottles a year.', source: 'https://collinaverde.example/wines' },
      { criterion: 'natural', assessment: 'no_information', note: 'No ingredient or additive information on the website (not required for wine).' },
    ],
    flags: [
      { severity: 'info', title: 'Organic claim', detail: '"Organic" is mentioned; the certification body code is needed during setup.', source: 'https://collinaverde.example/wines' },
    ],
    sourcesChecked: ['https://collinaverde.example', 'https://collinaverde.example/wines'],
  },

  globalspirits: {
    recommendation: 'likely_reject',
    confidence: 0.81,
    summary:
      'Trading company in the UK importing and reselling branded spirits. Does not make its own products, ' +
      'is registered outside the EU, and its brands are sold in national supermarket chains.',
    criteria: [
      { criterion: 'regional', assessment: 'concerns_found', note: 'Registered in the UK; products come from several countries.', source: 'application' },
      { criterion: 'not_mainstream', assessment: 'concerns_found', note: '"Available in Tesco and Sainsbury\'s nationwide."', source: 'https://globalspirits-trading.example/brands' },
      { criterion: 'quality', assessment: 'no_information', note: 'Focus is on volume and wholesale prices.' },
      { criterion: 'natural', assessment: 'concerns_found', note: 'One listed liqueur contains "artificial flavouring, colour E150a".', source: 'https://globalspirits-trading.example/brands' },
    ],
    flags: [
      { severity: 'critical', title: 'Reseller', detail: 'Applicant states they "partly" make products; website describes import and distribution only.', source: 'https://globalspirits-trading.example' },
      { severity: 'warning', title: 'Outside the EU', detail: 'Registered in the United Kingdom.', source: 'application' },
    ],
    sourcesChecked: ['https://globalspirits-trading.example', 'https://globalspirits-trading.example/brands'],
  },

  almwiese: {
    recommendation: 'needs_a_look',
    confidence: 0.55,
    summary:
      'Herb farm in Upper Bavaria making syrups and herbal salts. Regional maker, but one syrup lists "flavouring" ' +
      'without "natural", and products are sold in some Edeka stores. Worth a question before deciding.',
    criteria: [
      { criterion: 'regional', assessment: 'evidence_found', note: 'Grows and processes herbs on its own farm near Garmisch.', source: 'https://almwiese-kraeuterhof.example' },
      { criterion: 'not_mainstream', assessment: 'concerns_found', note: '"Also available at selected Edeka stores in Bavaria." Local, not national.', source: 'https://almwiese-kraeuterhof.example/where-to-buy' },
      { criterion: 'quality', assessment: 'evidence_found', note: 'Hand-picked herbs, small batches.', source: 'application' },
      { criterion: 'natural', assessment: 'concerns_found', note: 'Elderflower syrup ingredients include "Aroma" (flavouring) without "natural".', source: 'https://almwiese-kraeuterhof.example/syrups' },
    ],
    flags: [
      { severity: 'warning', title: 'Flavouring', detail: 'Ingredient list mentions "Aroma" in one product.', source: 'https://almwiese-kraeuterhof.example/syrups' },
      { severity: 'info', title: 'Supermarket presence', detail: 'Some regional Edeka stores; decide whether this counts as mainstream.', source: 'https://almwiese-kraeuterhof.example/where-to-buy' },
    ],
    sourcesChecked: [
      'https://almwiese-kraeuterhof.example',
      'https://almwiese-kraeuterhof.example/syrups',
      'https://almwiese-kraeuterhof.example/where-to-buy',
    ],
    suggestedQuestion:
      'Your elderflower syrup lists "Aroma". Is this a natural flavouring, and could you tell us where it comes from?',
  },

  hopfenwerk: {
    recommendation: 'needs_a_look',
    confidence: 0.4,
    summary:
      'Craft brewery in Hamburg. The story is short and the website could not be read, so there is little to judge. ' +
      'Shares a phone number with another application.',
    criteria: [
      { criterion: 'regional', assessment: 'evidence_found', note: 'Brewery address in Hamburg.', source: 'application' },
      { criterion: 'not_mainstream', assessment: 'no_information', note: 'No information about where the beer is sold.' },
      { criterion: 'quality', assessment: 'no_information', note: 'Story has one sentence about the beer.', source: 'application' },
      { criterion: 'natural', assessment: 'no_information', note: 'No ingredient information found.' },
    ],
    flags: [{ severity: 'warning', title: 'Thin description', detail: 'Not enough information to judge fit.', source: 'application' }],
    sourcesChecked: ['https://hopfenwerk-nord.example (not readable)'],
    suggestedQuestion: 'Could you tell us more about how you brew, which beers you make and where they are sold today?',
  },
};
