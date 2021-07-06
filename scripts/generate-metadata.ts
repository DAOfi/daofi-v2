const fs = require('fs')
const numTokens = 443

for (let i = 0; i < numTokens; ++i) {
  let prepend = ''
  if (i < 10) {
    prepend = '00'
  } else if (i < 100) {
    prepend = '0'
  }
  const metadata = {
    name: 'Karma DAO',
    description: 'Karma DAO x Communifty NFT',
    image: `https://communifty.mypinata.cloud/ipfs/QmRZ9P97EnmFoid4HiLKdTQquMy6ZKqa9S3B39NrmTBH43/KarmaDAO_assets/output${prepend}${i}.mp4`,
    attributes:[{ trait_type: 'Edition', value: `"${i + 1}"` }]
  }
  fs.writeFileSync(`KarmaDAO_metadata/${i + 1}`, JSON.stringify(metadata))
}