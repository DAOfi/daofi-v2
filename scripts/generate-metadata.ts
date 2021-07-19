const fs = require('fs')
const numTokens = 503

for (let i = 0; i < numTokens; ++i) {
  const metadata = {
    name: 'Karma DAO',
    description: `Karma DAO Membership #${i + 1}`,
    image: `https://communifty.mypinata.cloud/ipfs/QmTyXExQ7ChkUCQK68dFBQc68wPmAbJYzf1EqL4SefwgBw/karma_assets/${i + 1}.mp4`,
    attributes:[{ trait_type: "Edition", value: `"${i + 1}"` }]
  }
  fs.writeFileSync(`karma_metadata/${i + 1}`, JSON.stringify(metadata))
}