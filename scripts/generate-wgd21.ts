const fs = require('fs')
const numTokens = 367

for (let i = 0; i < numTokens; ++i) {
  const metadata = {
    name: 'WGD21',
    description: `Longest Day to Longest Day 2021-2022 Calendar`,
    image: `ipfs://Qmdq2F9922oRDwmfoDLSErq4BBhfDmoAyNuzCVznCiXdSF/wgd21_assets/${
      i + 1
    }.jpg`,
    attributes: [
      { trait_type: 'Print', value: i + 1, display_type: 'number' },
    ],
  }
  fs.writeFileSync(`wgd21_metadata/${i + 1}`, JSON.stringify(metadata))
}
