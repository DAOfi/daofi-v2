// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import './interfaces/IDAOfiV2Factory.sol';
import './interfaces/IDAOfiV2Pair.sol';

contract OwnableDelegateProxy {}

contract ProxyRegistry {
    mapping(address => OwnableDelegateProxy) public proxies;
}

contract DAOfiV2Pair is IDAOfiV2Pair, ERC721 {
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
    uint256 public x = decimals18; // initial supply must be at least 1
    uint256 public closeDeadline = 0;
    uint256 public ownerFees = 0;
    uint256 public platformFees = 0;

    // opensea compat
    address public proxyRegistryAddress;
    uint256 private currentTokenId = 0;
    uint256 private decimals18 = 10 ** 18;

    // modifier
    uint private unlocked = 1;

    /**
    * @dev Used to prevent reentrancy attack
    */
    modifier lock() {
        require(unlocked == 1, 'LOCKED');
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
        require(_m > 0 && _m <= SLOPE_DENOM, 'INVALID_M');
        require(_n > 0 && _n <= MAX_N, 'INVALID_N');
        require(_ownerFee <= MAX_OWNER_FEE, 'INVALID_OWNER_FEE');
        _setBaseURI(_baseTokenURI);
        nftReserve = _nftReserve;
        proxyRegistryAddress = _proxyAddress;
        pairOwner = _pairOwner;
        x = _initX * (decimals18);
        m = _m;
        n = _n;
        ownerFee = _ownerFee;
    }

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
        require(_nextOwner != address(0), 'INVALID_PAIR_OWNER');
        pairOwner = _nextOwner;
        emit SetPairOwner(msg.sender, pairOwner);
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
        require(closeDeadline != 0 && block.timestamp >= closeDeadline, 'INVALID_DEADLINE');
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

    function buy(address payable _to) external payable override lock returns (uint256) {
        require(closeDeadline == 0 || block.timestamp < closeDeadline, 'MARKET_CLOSED');
        require(nftReserve > 0, 'SOLD_OUT');
        uint price = buyPrice();
        require(msg.value >= price, 'INSUFFICIENT_FUNDS');
        // Mint a new token to the recipient
        uint256 newTokenId = _getNextTokenId();
        _mint(_to, newTokenId);
        _incrementTokenId();
        // Decrement NFT reserve
        nftReserve--;
        // Refund excess ETH
        if (msg.value > price) {
            _to.transfer(msg.value.sub(price));
        }
        // Divi up fees
        uint platformShare = price.mul(platformFee).div(1000);
        uint ownerShare = price.mul(ownerFee).div(1000);
        platformFees = platformFees.add(platformShare);
        ownerFees = ownerFees.add(ownerShare);
        // Update ETH reserve
        ethReserve = ethReserve.add(price).sub(platformShare).sub(ownerShare);
        // Update X
        x = x.add(decimals18.sub(decimals18.mul(platformFee.add(ownerFee)).div(1000)));
        emit Buy(msg.sender, msg.value, newTokenId, _to);
        return newTokenId;
    }

    function sell(uint256 _tokenId, address payable _to) external override lock {
        require(closeDeadline == 0 || block.timestamp < closeDeadline, 'MARKET_CLOSED');
        require(x > decimals18, 'INVALID_X');
        uint price = sellPrice();
        require(ethReserve >= price, 'INSUFFICIENT_RESERVE');
        // Burn the tokenId
        require(_isApprovedOrOwner(_msgSender(), _tokenId), 'UNAPPROVED_SELL');
        _burn(_tokenId);
        // Increment NFT reserve
        nftReserve++;
        // Divi up fees
        uint platformShare = price.mul(platformFee).div(1000);
        uint ownerShare = price.mul(ownerFee).div(1000);
        platformFees = platformFees.add(platformShare);
        ownerFees = ownerFees.add(ownerShare);
        // Transfer sale proceeds
        _to.transfer(price.sub(platformShare).sub(ownerShare));
        // Update ETH reserve
        ethReserve = ethReserve.sub(price);
        // Update X
        x = x.sub(decimals18.sub(decimals18.mul(platformFee.add(ownerFee)).div(1000)));
        emit Sell(msg.sender, price.sub(platformShare).sub(ownerShare), _tokenId, _to);
    }

    /**
    * @dev Returns the current buy price of a single NFT
    */
    function buyPrice() public view override returns (uint256) {
        return (m.mul(x ** n).div(SLOPE_DENOM));
    }

    /**
    * @dev Returns the current sell price of a single NFT
    */
    function sellPrice() public view override returns (uint256) {
        return (m.mul(x.sub(decimals18) ** n).div(SLOPE_DENOM));
    }
}
