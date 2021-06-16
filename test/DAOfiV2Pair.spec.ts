import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
import { expect } from 'chai'
import { Contract } from 'ethers'
import { ethers } from 'hardhat'
// import { getXForPrice, expandTo18Decimals, expandToDecimals } from './shared/utilities'
import { pairFixture } from './shared/fixtures'

const zero = ethers.BigNumber.from(0)
const proxy = '0xf57b2c51ded3a29e6891aba85459d600256cf317'
const name = 'Community NFT'
const symbol = 'CNFT'
const baseURI = 'https:/test.server/'
const maxM = 1e6
const defaults = [
  10, // supply
  1, // init x
  maxM, // m
  1, // n
  100, // owner fee
]

let factory: Contract
let pair: Contract
let wallet: SignerWithAddress

describe('DAOfiV2Pair test all success and revert cases', () => {
  beforeEach(async () => {
    wallet = (await ethers.getSigners())[0]
  })

  it('reverts for any bad parameter given to constructor', async () => {
    const Pair = await ethers.getContractFactory('DAOfiV2Pair')
    await expect(Pair.deploy(name, symbol, baseURI, proxy, wallet.address, 10, 0, maxM, 1, 100)).to.be.revertedWith(
      'ZERO_INIT_X'
    )
    await expect(Pair.deploy(name, symbol, baseURI, proxy, wallet.address, 10, 1, 0, 1, 100)).to.be.revertedWith(
      'INVALID_M'
    )
    await expect(Pair.deploy(name, symbol, baseURI, proxy, wallet.address, 10, 1, maxM + 1, 1, 100)).to.be.revertedWith(
      'INVALID_M'
    )
    await expect(Pair.deploy(name, symbol, baseURI, proxy, wallet.address, 10, 1, maxM, 0, 100)).to.be.revertedWith(
      'INVALID_N'
    )
    await expect(Pair.deploy(name, symbol, baseURI, proxy, wallet.address, 10, 1, maxM, 4, 100)).to.be.revertedWith(
      'INVALID_N'
    )
    await expect(Pair.deploy(name, symbol, baseURI, proxy, wallet.address, 10, 1, maxM, 1, 998)).to.be.revertedWith(
      'INVALID_OWNER_FEE'
    )
  })

  it('will allow preMint and revert preMint in all conditions', async () => {
    const wallet2 = (await ethers.getSigners())[1]
    // create normal pair
    pair = (await pairFixture(wallet, name, symbol, baseURI, ...defaults)).pair
    // attempt to preMint from wallet 2
    pair = await pair.connect(wallet2)
    await expect(pair.preMint(40)).to.be.revertedWith('OWNER_ONLY')
    // switch back to wallet1
    pair = await pair.connect(wallet)
    // successfully preMint
    await expect(pair.preMint(40)).to.emit(pair, 'PreMint').withArgs(40)
    // double preMint
    await expect(pair.preMint(40)).to.be.revertedWith('DOUBLE_PREMINT')
    // successfully buy
    const buyPrice = await pair.buyPrice()
    await expect(pair.buy(wallet.address, { value: buyPrice })).to.emit(pair, 'Buy')
    // market open
    await expect(pair.preMint(40)).to.be.revertedWith('MARKET_OPEN')
    // successfully signal close
    await expect(pair.signalClose()).to.emit(pair, 'SignalClose')
    await ethers.provider.send('evm_increaseTime', [86400])
    await ethers.provider.send('evm_mine', [])
    await expect(pair.close()).to.emit(pair, 'Close')
    // market closed
    await expect(pair.preMint(40)).to.be.revertedWith('MARKET_CLOSED')
  })

  it('will quantify gas cost for preMint', async () => {
    // create normal pair
    pair = (await pairFixture(wallet, name, symbol, baseURI, ...defaults)).pair
    // successfully preMint 1
    let tx = await pair.preMint(1)
    let receipt = await tx.wait()
    expect(receipt.gasUsed).to.eq(219596)
    // create normal pair
    pair = (await pairFixture(wallet, name, symbol, baseURI, ...defaults)).pair
    // successfully preMint 2
    tx = await pair.preMint(2)
    receipt = await tx.wait()
    expect(receipt.gasUsed).to.eq(333934)
  })

  it('will properly allow for switching pair owner and revert for bad params', async () => {
    const wallet2 = (await ethers.getSigners())[1]
    const wallet3 = (await ethers.getSigners())[2]
    pair = (await pairFixture(wallet, name, symbol, baseURI, 10, 1, maxM, 1, 100)).pair
    // owner is the initial wallet in this case, switch wallet to test restriction
    pair = await pair.connect(wallet2)
    await expect(pair.setPairOwner(wallet3.address)).to.be.revertedWith('FORBIDDEN_PAIR_OWNER')
    // switch back to wallet1
    pair = await pair.connect(wallet)
    // invalid owner
    await expect(pair.setPairOwner(ethers.constants.AddressZero)).to.be.revertedWith('INVALID_PAIR_OWNER')
    // valid switch
    await expect(pair.setPairOwner(wallet2.address))
      .to.emit(pair, 'SetPairOwner')
      .withArgs(wallet.address, wallet2.address)
  })

  it('will allow for pair owner to signal close and revert for invalid attempts', async () => {
    const wallet2 = (await ethers.getSigners())[1]
    pair = (await pairFixture(wallet, name, symbol, baseURI, 10, 1, maxM, 1, 100)).pair
    // owner is the initial wallet in this case, switch wallet to test restriction
    pair = await pair.connect(wallet2)
    await expect(pair.signalClose()).to.be.revertedWith('FORBIDDEN_SIGNAL_CLOSE')
    // switch back to wallet1
    pair = await pair.connect(wallet)
    // success
    await expect(pair.signalClose()).to.emit(pair, 'SignalClose')
    await expect(pair.closeDeadline()).to.not.equal(0)
    // close already signaled
    await expect(pair.signalClose()).to.be.revertedWith('CLOSE_ALREADY_SIGNALED')
  })

  it('will allow for any caller to close the market past signal deadline, or otherwise revert', async () => {
    const wallet2 = (await ethers.getSigners())[1]
    pair = (await pairFixture(wallet, name, symbol, baseURI, 10, 1, maxM, 1, 100)).pair
    // attempt close, no signal
    await expect(pair.close()).to.be.revertedWith('INVALID_DEADLINE')
    // successfully signal close
    await expect(pair.signalClose()).to.emit(pair, 'SignalClose')
    // attempt close, deadline not expired
    await expect(pair.close()).to.be.revertedWith('INVALID_DEADLINE')
    // timeout
    await ethers.provider.send('evm_increaseTime', [86400])
    await ethers.provider.send('evm_mine', [])
    // successfully close from any wallet
    pair = await pair.connect(wallet2)
    await expect(pair.close()).to.emit(pair, 'Close')
  })

  it('will revert buy calls with invalid params supplied', async () => {
    // create normal pair
    pair = (await pairFixture(wallet, name, symbol, baseURI, ...defaults)).pair
    // insufficient price
    const buyPrice = await pair.buyPrice()
    await expect(pair.buy(wallet.address)).to.be.revertedWith('INSUFFICIENT_FUNDS')
    // create pair with supply 1
    const params = [...defaults]
    params[0] = 1
    pair = (await pairFixture(wallet, name, symbol, baseURI, ...params)).pair
    // successfully buy 1
    await expect(pair.buy(wallet.address, { value: buyPrice })).to.emit(pair, 'Buy')
    // sold out
    await expect(pair.buy(wallet.address, { value: buyPrice })).to.be.revertedWith('SOLD_OUT')
    // close market
    await expect(pair.signalClose()).to.emit(pair, 'SignalClose')
    await ethers.provider.send('evm_increaseTime', [86400])
    await ethers.provider.send('evm_mine', [])
    await expect(pair.close()).to.emit(pair, 'Close')
    // market closed
    await expect(pair.buy(wallet.address, { value: buyPrice })).to.be.revertedWith('MARKET_CLOSED')
  })

  it('will revert sell calls with invalid params supplied', async () => {
    const wallet2 = (await ethers.getSigners())[1]
    // create normal pair
    pair = (await pairFixture(wallet, name, symbol, baseURI, ...defaults)).pair
    // attempt to sell before buying
    await expect(pair.sell(1, wallet.address)).to.be.revertedWith('INVALID_X')
    // successfully buy 1
    const buyPrice = await pair.buyPrice()
    await expect(pair.buy(wallet.address, { value: buyPrice })).to.emit(pair, 'Buy')
    // sell unappproved
    pair = await pair.connect(wallet2)
    await expect(pair.sell(1, wallet.address)).to.be.revertedWith('UNAPPROVED_SELL')
    // successfull sell
    pair = await pair.connect(wallet)
    await expect(pair.sell(1, wallet.address)).to.emit(pair, 'Sell')
    // close market
    await expect(pair.signalClose()).to.emit(pair, 'SignalClose')
    await ethers.provider.send('evm_increaseTime', [86400])
    await ethers.provider.send('evm_mine', [])
    await expect(pair.close()).to.emit(pair, 'Close')
    // market closed
    await expect(pair.sell(1, wallet.address)).to.be.revertedWith('MARKET_CLOSED')
  })
})

describe('DAOfiV1Pair test curves with various settings', () => {
  beforeEach(async () => {
    wallet = (await ethers.getSigners())[0]
  })

  // symbol, reserve, init x, m, n, fee, pre mint
  const curveTestCases: any[][] = [
    ['TNFT1', 10, 1, maxM, 1, 10, 10]
  ]

  curveTestCases.forEach((testData, i) => {
    it(`case: ${i}`, async () => {
      pair = (await pairFixture(
        wallet,
        name,
        testData[0],
        baseURI,
        testData[1],
        testData[2],
        testData[3],
        testData[4],
        testData[5]
      )).pair
      // premint
      // check pair owner NFT balance
      // check initial price
      // loop buy reserve with wallet 2
        // check nft reserve, total supply
        // check eth reserve, fees, buy, sell price
      // loop sell reserve with wallet 2
        // check nft reserve, total supply
        // check eth reserve, fees, buy, sell price
      // signal close, close, withdraw fees owner/ platform
        // check eth reserves, fees
    })
  })
})
