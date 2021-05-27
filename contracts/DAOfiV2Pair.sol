// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721Burnable.sol";
import 'hardhat/console.sol';
import './interfaces/IDAOfiV2Factory.sol';
import './interfaces/IDAOfiV2Pair.sol';

contract OwnableDelegateProxy {}

contract ProxyRegistry {
    mapping(address => OwnableDelegateProxy) public proxies;
}

contract DAOfiV2Pair is IDAOfiV2Pair, ERC721Burnable {
    using Strings for string;
    using SafeMath for *;

    uint32 private constant SLOPE_DENOM = 1000000; // slope = m / SLOPE_DENOM
    uint32 private constant MAX_N = 3; // y = mx^n, n <= MAX_N
    uint32 private constant MAX_OWNER_FEE = 997; // 99.7%

    uint8 public constant platformFee = 3; // 0.3%
    address payable public constant platform = 0xAD10D4F9937D743cbEb1383B1D3A3AD15Ace75D6;

    uint32 public m = SLOPE_DENOM;
    uint32 public n = 1;
    uint32 public ownerFee = 0;
    address payable public pairOwner = platform;
    uint256 public nftReserve = 1;
    uint256 public ethReserve = 0;
    uint256 public x = 0; // track base tokens issued
    uint256 public closeDeadline = 0;
    uint256 public ownerFees = 0;
    uint256 public platformFees = 0;

    // opensea compat
    address public proxyRegistryAddress;
    uint256 private currentTokenId = 0;

    // modifier
    uint private unlocked = 1;

    /**
    * @dev Used to prevent reentrancy attack
    */
    modifier lock() {
        require(unlocked == 1, 'DAOfiV1: LOCKED');
        unlocked = 0;
        _;
        unlocked = 1;
    }

    /**
    * @dev Create the NFT contract from name symbol and baseURI
    */
    constructor(
        string memory _name,
        string memory _symbol,
        string memory _baseTokenURI,
        address _proxyAddress,
        address payable _pairOwner,
        uint256 _nftReserve,
        uint256 _initX,
        uint32 _m,
        uint32 _n,
        uint32 _ownerFee
    ) ERC721(_name, _symbol) {
        require(keccak256(bytes(_baseTokenURI)) != keccak256(bytes("")), 'EMPTY_URI');
        require(_proxyAddress != address(0), 'ZERO_PROXY_ADDRESS');
        require(_nftReserve > 0, 'ZERO_NFT_RESERVE');
        require(_initX > 0, 'ZERO_INIT_X');
        require(_m > 0 && _m <= SLOPE_DENOM, 'INVALID_SLOPE_NUMERATOR');
        require(_n > 0 && _n <= MAX_N, 'INVALID_EXPONENT');
        require(_ownerFee <= MAX_OWNER_FEE, 'INVALID_OWNER_FEE');
        _setBaseURI(_baseTokenURI);
        proxyRegistryAddress = _proxyAddress;
        pairOwner = _pairOwner;
        x = _initX;
        m = _m;
        n = _n;
    }

    /**
     * @dev Mints a token to an address with a tokenURI.
     * @param _to address of the future owner of the token
     */
    // function mintTo(address _to) internal onlyOwner {
    //     uint256 newTokenId = _getNextTokenId();
    //     _mint(_to, newTokenId);
    //     _incrementTokenId();
    // }

    /**
     * @dev calculates the next token ID based on value of currentTokenId
     * @return uint256 for the next token ID
     */
    function _getNextTokenId() private view returns (uint256) {
        return currentTokenId.add(1);
    }

    /**
     * @dev increments the value of _currentTokenId
     */
    function _incrementTokenId() private {
        currentTokenId++;
    }

    /**
     * Override isApprovedForAll to whitelist user's OpenSea proxy accounts to enable gas-less listings.
     */
    function isApprovedForAll(address owner, address operator)
        public
        view
        override
        returns (bool)
    {
        // Whitelist OpenSea proxy contract for easy trading.
        ProxyRegistry proxyRegistry = ProxyRegistry(proxyRegistryAddress);
        if (address(proxyRegistry.proxies(owner)) == operator) {
            return true;
        }

        return super.isApprovedForAll(owner, operator);
    }

    /**
    * @dev Transfer ownership of the pair's reserves and owner fees
    */
    function setPairOwner(address payable _nextOwner) external override {
        require(msg.sender == pairOwner, 'FORBIDDEN_PAIR_OWNER');
        require(_nextOwner != address(0), 'INVALID_OWNER');
        pairOwner = _nextOwner;
    }

    function signalClose() external override {
        require(msg.sender == pairOwner, 'FORBIDDEN_SIGNAL_CLOSE');
        require(closeDeadline == 0, 'CLOSE_ALREADY_SIGNALED');
        closeDeadline = block.timestamp + 86400;
        emit SignalClose(msg.sender, closeDeadline);
    }

    /**
    * @dev Function to close the market and retrun the ethReserve to the pair owner
    */
    function close() external override {
        require(closeDeadline != 0 && block.timestamp > closeDeadline, 'INVALID_DEADLINE');
        pairOwner.transfer(ethReserve);
        emit Close(msg.sender, ethReserve);
        ethReserve = 0;
    }

    /**
    * @dev Function to remove fees attributed to owner.
    * Fees for the owner are reset to 0 once called.
    */
    function withdrawOwnerFees() external override {
        pairOwner.transfer(ownerFees);
        emit WithdrawOwnerFees(msg.sender, ownerFees);
        ownerFees = 0;
    }

    /**
    * @dev Function to remove fees attributed to platform.
    * Fees for the platform are reset to 0 once called.
    */
    function withdrawPlatformFees() external override {
        platform.transfer(platformFees);
        emit WithdrawPlatformFees(msg.sender, platformFees);
        platformFees = 0;
    }

    function buy(address payable to) external override lock {
        // require(msg.sender == router, 'DAOfiV1: FORBIDDEN_SWAP');
        // require(deposited, 'DAOfiV1: UNINITIALIZED_SWAP');
        // require(
        //     (tokenIn == baseToken && tokenOut == quoteToken) || (tokenOut == baseToken && tokenIn == quoteToken),
        //     'DAOfiV1: INCORRECT_TOKENS'
        // );
        // require(to != baseToken && to != quoteToken, 'DAOfiV1: INVALID_TO');
        // require(amountOut > 0 && amountIn > 0, 'DAOfiV1: INSUFFICIENT_IO_AMOUNT');
        // _safeTransfer(tokenOut, to, amountOut); // optimistically transfer tokens
        // uint256 balanceIn;
        // uint256 reserveIn;
        // if (tokenIn == baseToken) {
        //     reserveIn = reserveBase;
        //     balanceIn = IERC20(baseToken).balanceOf(address(this))
        //         .sub(feesBaseOwner)
        //         .sub(feesBasePlatform);
        // } else if (tokenIn == quoteToken) {
        //     reserveIn = reserveQuote;
        //     balanceIn = IERC20(quoteToken).balanceOf(address(this))
        //         .sub(feesQuoteOwner)
        //         .sub(feesQuotePlatform);
        // }
        // uint256 surplus = balanceIn > reserveIn ? balanceIn - reserveIn : 0;
        // require(amountIn <= surplus, 'DAOfiV1: INCORRECT_INPUT_AMOUNT');
        // // account for owner and platform fees separately
        // uint256 amountInSubOwnerFee = amountIn.mul(1000 - fee) / 1000;
        // uint256 amountInSubPlatformFee = amountIn.mul(1000 - PLATFORM_FEE) / 1000;
        // uint256 amountInSubFees = amountIn.mul(1000 - (fee + PLATFORM_FEE)) / 1000;
        // // Check that inputs equal output
        // // handle quote to base
        // if (tokenOut == baseToken) {
        //     require(getBaseOut(amountInSubFees) >= amountOut, 'DAOfiV1: INVALID_BASE_OUTPUT');
        //     require(amountOut <= reserveBase, 'DAOfiV1: INSUFFICIENT_BASE_RESERVE');
        //     x = x.add(amountOut);
        //     reserveQuote = reserveQuote.add(amountInSubFees);
        //     reserveBase = reserveBase.sub(amountOut);
        //     feesQuoteOwner = feesQuoteOwner.add(amountIn).sub(amountInSubOwnerFee);
        //     feesQuotePlatform = feesQuotePlatform.add(amountIn).sub(amountInSubPlatformFee);
        // } else if (tokenOut == quoteToken) {
        //     require(getQuoteOut(amountInSubFees) >= amountOut, 'DAOfiV1: INVALID_QUOTE_OUTPUT');
        //     require(amountOut <= reserveQuote, 'DAOfiV1: INSUFFICIENT_QUOTE_RESERVE');
        //     x = x.sub(amountInSubFees);
        //     reserveQuote = reserveQuote.sub(amountOut);
        //     reserveBase = reserveBase.add(amountInSubFees);
        //     feesBaseOwner = feesBaseOwner.add(amountIn).sub(amountInSubOwnerFee);
        //     feesBasePlatform = feesBasePlatform.add(amountIn).sub(amountInSubPlatformFee);
        // }
        // emit Swap(address(this), msg.sender, tokenIn, tokenOut, amountIn, amountOut, to);
    }

    function sell(address payable to) external override lock {
        // require(msg.sender == router, 'DAOfiV1: FORBIDDEN_SWAP');
        // require(deposited, 'DAOfiV1: UNINITIALIZED_SWAP');
        // require(
        //     (tokenIn == baseToken && tokenOut == quoteToken) || (tokenOut == baseToken && tokenIn == quoteToken),
        //     'DAOfiV1: INCORRECT_TOKENS'
        // );
        // require(to != baseToken && to != quoteToken, 'DAOfiV1: INVALID_TO');
        // require(amountOut > 0 && amountIn > 0, 'DAOfiV1: INSUFFICIENT_IO_AMOUNT');
        // _safeTransfer(tokenOut, to, amountOut); // optimistically transfer tokens
        // uint256 balanceIn;
        // uint256 reserveIn;
        // if (tokenIn == baseToken) {
        //     reserveIn = reserveBase;
        //     balanceIn = IERC20(baseToken).balanceOf(address(this))
        //         .sub(feesBaseOwner)
        //         .sub(feesBasePlatform);
        // } else if (tokenIn == quoteToken) {
        //     reserveIn = reserveQuote;
        //     balanceIn = IERC20(quoteToken).balanceOf(address(this))
        //         .sub(feesQuoteOwner)
        //         .sub(feesQuotePlatform);
        // }
        // uint256 surplus = balanceIn > reserveIn ? balanceIn - reserveIn : 0;
        // require(amountIn <= surplus, 'DAOfiV1: INCORRECT_INPUT_AMOUNT');
        // // account for owner and platform fees separately
        // uint256 amountInSubOwnerFee = amountIn.mul(1000 - fee) / 1000;
        // uint256 amountInSubPlatformFee = amountIn.mul(1000 - PLATFORM_FEE) / 1000;
        // uint256 amountInSubFees = amountIn.mul(1000 - (fee + PLATFORM_FEE)) / 1000;
        // // Check that inputs equal output
        // // handle quote to base
        // if (tokenOut == baseToken) {
        //     require(getBaseOut(amountInSubFees) >= amountOut, 'DAOfiV1: INVALID_BASE_OUTPUT');
        //     require(amountOut <= reserveBase, 'DAOfiV1: INSUFFICIENT_BASE_RESERVE');
        //     x = x.add(amountOut);
        //     reserveQuote = reserveQuote.add(amountInSubFees);
        //     reserveBase = reserveBase.sub(amountOut);
        //     feesQuoteOwner = feesQuoteOwner.add(amountIn).sub(amountInSubOwnerFee);
        //     feesQuotePlatform = feesQuotePlatform.add(amountIn).sub(amountInSubPlatformFee);
        // } else if (tokenOut == quoteToken) {
        //     require(getQuoteOut(amountInSubFees) >= amountOut, 'DAOfiV1: INVALID_QUOTE_OUTPUT');
        //     require(amountOut <= reserveQuote, 'DAOfiV1: INSUFFICIENT_QUOTE_RESERVE');
        //     x = x.sub(amountInSubFees);
        //     reserveQuote = reserveQuote.sub(amountOut);
        //     reserveBase = reserveBase.add(amountInSubFees);
        //     feesBaseOwner = feesBaseOwner.add(amountIn).sub(amountInSubOwnerFee);
        //     feesBasePlatform = feesBasePlatform.add(amountIn).sub(amountInSubPlatformFee);
        // }
        // emit Swap(address(this), msg.sender, tokenIn, tokenOut, amountIn, amountOut, to);
    }

    /**
    * @dev Returns the current price of a single NFT
    */
    function price() public view override returns (uint256) {
        return (m.mul(x ** n).div(SLOPE_DENOM)).mul(10 ** 18);
    }
}
