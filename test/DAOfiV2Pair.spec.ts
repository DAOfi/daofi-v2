import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
import { expect } from 'chai'
import { Contract, ContractFactory } from 'ethers'
import { ethers } from 'hardhat'
import { getPriceForXWithFees, getPriceForX } from './shared/utilities'

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

let Pair: ContractFactory
let pair: Contract
let wallet: SignerWithAddress

describe('DAOfiV2Pair test all success and revert cases', () => {
  beforeEach(async () => {
    Pair = await ethers.getContractFactory('DAOfiV2Pair')
    wallet = (await ethers.getSigners())[0]
  })

  it('reverts for any bad parameter given to constructor', async () => {
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
    pair = await Pair.deploy(name, symbol, baseURI, proxy, wallet.address, ...defaults)
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
    pair = await Pair.deploy(name, symbol, baseURI, proxy, wallet.address, ...defaults)
    // successfully preMint 1
    let tx = await pair.preMint(1)
    let receipt = await tx.wait()
    expect(receipt.gasUsed).to.eq(219596)
    // create normal pair
    pair = await Pair.deploy(name, symbol, baseURI, proxy, wallet.address, ...defaults)
    // successfully preMint 2
    tx = await pair.preMint(2)
    receipt = await tx.wait()
    expect(receipt.gasUsed).to.eq(333934)
  })

  it('will properly allow for switching pair owner and revert for bad params', async () => {
    const wallet2 = (await ethers.getSigners())[1]
    const wallet3 = (await ethers.getSigners())[2]
    pair = await Pair.deploy(name, symbol, baseURI, proxy, wallet.address, ...defaults)
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
    pair = await Pair.deploy(name, symbol, baseURI, proxy, wallet.address, ...defaults)
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
    pair = await Pair.deploy(name, symbol, baseURI, proxy, wallet.address, ...defaults)
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
    pair = await Pair.deploy(name, symbol, baseURI, proxy, wallet.address, ...defaults)
    // insufficient price
    const buyPrice = await pair.buyPrice()
    await expect(pair.buy(wallet.address)).to.be.revertedWith('INSUFFICIENT_FUNDS')
    // create pair with supply 1
    const params = [...defaults]
    params[0] = 1
    pair = await Pair.deploy(name, symbol, baseURI, proxy, wallet.address, ...params)
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
    pair = await Pair.deploy(name, symbol, baseURI, proxy, wallet.address, ...defaults)
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

  // reserve, init x, m, n, fee, pre mint
  const curveTestCases: any[][] = [
    [10, 1, 1, 1, 50, 10],
    [15, 2, 1e3, 2, 50, 5]
  ]

  curveTestCases.forEach((testData, i) => {
    it(`case: ${i}`, async () => {
      const wallet2 = (await ethers.getSigners())[1]
      pair = await Pair.deploy(
        name,
        symbol,
        baseURI,
        proxy,
        wallet.address,
        testData[0],
        testData[1],
        testData[2],
        testData[3],
        testData[4]
      )
      // premint
      await expect(pair.preMint(testData[5])).to.emit(pair, 'PreMint').withArgs(testData[5])
      const balance = await pair.balanceOf(wallet.address)
      expect(balance).to.be.equal(ethers.BigNumber.from(testData[5]))
      // loop buy reserve with wallet 2
      pair = await pair.connect(wallet2)
      let totalEthReserve = zero
      let totalPlatfromFees = zero
      let totalOwnerFees = zero
      for (let i = 0; i < testData[0]; ++i) {
        // check buy price
        const buyPrice = await pair.buyPrice()
        const calcPrice = getPriceForXWithFees(testData[1] + i, testData[2], testData[3], testData[4])
        expect(buyPrice).to.be.equal(ethers.BigNumber.from(calcPrice))
        // buy
        await expect(pair.buy(wallet2.address, { value: buyPrice })).to.emit(pair, 'Buy')
          .withArgs(wallet2.address, buyPrice, testData[5] + (i + 1), wallet2.address)
        // check nft reserve
        const nftReserve = await pair.nftReserve()
        expect(nftReserve).to.be.equal(ethers.BigNumber.from(testData[0] - (i + 1)))
        // check eth reserve
        const basePrice = ethers.BigNumber.from(getPriceForX(testData[1] + i, testData[2], testData[3]))
        const ethReserve = await pair.ethReserve()
        totalEthReserve = totalEthReserve.add(basePrice)
        expect(ethReserve).to.be.equal(ethers.BigNumber.from(totalEthReserve))
        // check fees
        const platformFees = await pair.platformFees()
        const ownerFees = await pair.ownerFees()
        totalPlatfromFees = totalPlatfromFees.add(basePrice.mul(50).div(1000))
        totalOwnerFees = totalOwnerFees.add(basePrice.mul(testData[4]).div(1000))
        expect(platformFees).to.be.equal(totalPlatfromFees)
        expect(ownerFees).to.be.equal(totalOwnerFees)
      }
      // check wallet 2 owns purchased nfts
      const balance2 = await pair.balanceOf(wallet2.address)
      expect(balance2).to.be.equal(ethers.BigNumber.from(testData[0]))
      // loop sell purchased tokens with wallet 2
      for (let i = 0; i < testData[0]; ++i) {
        const tokenId = testData[5] + (i + 1);
        const sellPrice = await pair.sellPrice()
        // sell
        await expect(pair.sell(tokenId, wallet2.address)).to.emit(pair, 'Sell')
          .withArgs(wallet2.address, sellPrice, tokenId, wallet2.address)
        const nftReserve = await pair.nftReserve()
        expect(nftReserve).to.be.equal(ethers.BigNumber.from((i + 1)))
        // check eth reserve
        const basePrice = ethers.BigNumber.from(getPriceForX(testData[0] - i + (testData[1] - 1), testData[2], testData[3]))
        const ethReserve = await pair.ethReserve()
        totalEthReserve = totalEthReserve.sub(basePrice)
        expect(ethReserve).to.be.equal(ethers.BigNumber.from(totalEthReserve))
        // check fees
        const platformFees = await pair.platformFees()
        const ownerFees = await pair.ownerFees()
        totalPlatfromFees = totalPlatfromFees.add(basePrice.mul(50).div(1000))
        totalOwnerFees = totalOwnerFees.add(basePrice.mul(testData[4]).div(1000))
        expect(platformFees).to.be.equal(totalPlatfromFees)
        expect(ownerFees).to.be.equal(totalOwnerFees)
      }

      // withdraw fees, check they are 0, and check eth reserve still intact
      await expect(pair.withdrawOwnerFees()).to.emit(pair, 'WithdrawOwnerFees')
        .withArgs(wallet2.address, totalOwnerFees)
      expect(await pair.ownerFees()).to.be.equal(zero)
      await expect(pair.withdrawPlatformFees()).to.emit(pair, 'WithdrawPlatformFees')
        .withArgs(wallet2.address, totalPlatfromFees)
      expect(await pair.platformFees()).to.be.equal(zero)
      expect(await pair.ethReserve()).to.be.equal(totalEthReserve)
      // signal close, allow for buy and sell
      pair = await pair.connect(wallet)
      await expect(pair.signalClose()).to.emit(pair, 'SignalClose')
      // buy twice to have some resere on close
      await expect(pair.buy(wallet.address, { value: await pair.buyPrice() })).to.emit(pair, 'Buy')
      await expect(pair.buy(wallet.address, { value: await pair.buyPrice() })).to.emit(pair, 'Buy')
      await expect(pair.sell(testData[0] + testData[5], wallet.address)).to.emit(pair, 'Sell')
      // close market with non-zero reserve
      await ethers.provider.send('evm_increaseTime', [86400])
      await ethers.provider.send('evm_mine', [])
      expect(await pair.ethReserve()).to.not.be.equal(zero)
      await expect(pair.close()).to.emit(pair, 'Close')
      // reserve removed
      expect(await pair.ethReserve()).to.be.equal(zero)
      // withdraw fees
      expect(await pair.ownerFees()).to.not.be.equal(zero)
      await expect(pair.withdrawOwnerFees()).to.emit(pair, 'WithdrawOwnerFees')
      expect(await pair.ownerFees()).to.be.equal(zero)
      expect(await pair.platformFees()).to.not.be.equal(zero)
      await expect(pair.withdrawPlatformFees()).to.emit(pair, 'WithdrawPlatformFees')
      expect(await pair.platformFees()).to.be.equal(zero)
    })
  })
})
