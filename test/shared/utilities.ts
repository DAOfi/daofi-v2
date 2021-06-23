import { ethers } from 'hardhat'
import { BigNumber } from 'ethers'

export function expandTo18Decimals(n: number): BigNumber {
  return expandToDecimals(n, 18)
}

export function expandToDecimals(num: number, decimals: number): BigNumber {
  return ethers.BigNumber.from(num).mul(ethers.BigNumber.from(10).pow(decimals))
}

// y = mx ** n
// given y = price, solve for x
export function getXForPrice(price: number, m: number, n: number): number {
  return (price * (1e6 / m)) ** (1 / n)
}

export function getPriceForXWithFees(x: number, m: number, n: number, fee: number): string {
  const numer = BigNumber.from(m)
  const denom = BigNumber.from(1e6)
  const xToN = expandTo18Decimals(x ** n)
  const basePrice = numer.mul(xToN).div(denom)
  return basePrice.mul(1000 + 50 + fee).div(1000).toString()
}


export function getPriceForX(x: number, m: number, n: number): string {
  const numer = BigNumber.from(m)
  const denom = BigNumber.from(1e6)
  const xToN = expandTo18Decimals(x ** n)
  return numer.mul(xToN).div(denom).toString()
}