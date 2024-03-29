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
    process.env.PAIR || '0x72df4356B7723C45959dbE4A30B401d8Eb2997d2',
    DAOfiV2Pair.abi,
    wallet
  )
  console.log('Pair:', pair.address)

  const buyPrice = await pair.buyPrice()
  console.log('Buy price:', buyPrice.toString())

  const buyTx = await pair.buy(wallet.address, {
    gasLimit: 8000000,
    gasPrice: ethers.utils.parseUnits('50', 'gwei'),
    value: buyPrice,
  })

  const buyResult = await buyTx.wait()

  console.log('Buy result:', buyResult)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
