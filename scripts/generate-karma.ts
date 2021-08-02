const fs = require('fs')
const numTokens = 503

for (let i = 0; i < numTokens; ++i) {
  const metadata = {
    name: 'Karma DAO',
    description: `Karma DAO Membership #${i + 1}`,
    image: `ipfs://QmTyXExQ7ChkUCQK68dFBQc68wPmAbJYzf1EqL4SefwgBw/karma_assets/${
      i + 1
    }.mp4`,
    attributes: [
      { trait_type: 'Membership', value: i + 1, display_type: 'number' },
    ],
  }
  fs.writeFileSync(`karma_metadata/${i + 1}`, JSON.stringify(metadata))
}
