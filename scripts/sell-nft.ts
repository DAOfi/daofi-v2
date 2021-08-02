import { ethers } from 'ethers'
import DAOfiV2Pair from '../build/contracts/DAOfiV2Pair.sol/DAOfiV2Pair.json'

const sleep = async (time: number) =>
  new Promise((resolve) => setTimeout(resolve, time))

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.JSONRPC_URL ||
      'https://rinkeby.infura.io/v3/0287e4e2fe7648888b843e2462ac67ba'
  )
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '', provider)
  console.log('Wallet:', wallet.address)

  const pair = new ethers.Contract(
    process.env.PAIR || '0xc95A9691806C23365e4F12674A315AB08d2829Fa',
    DAOfiV2Pair.abi,
    wallet
  )
  console.log('Pair:', pair.address)

  const sellPrice = await pair.sellPrice()
  console.log('Sell price:', sellPrice.toString())

  // replace tokenId with actual ID you are selling
  const sellTx = await pair.sell(1, wallet.address, {
    gasLimit: 8000000,
    gasPrice: ethers.utils.parseUnits('20', 'gwei'),
  })

  const sellResult = await sellTx.wait()

  console.log('Sell result:', sellResult)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
