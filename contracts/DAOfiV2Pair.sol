// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./interfaces/IDAOfiV2Pair.sol";

contract OwnableDelegateProxy {}

contract ProxyRegistry {
    mapping(address => OwnableDelegateProxy) public proxies;
}

contract DAOfiV2Pair is IDAOfiV2Pair, ERC721 {
    using SafeMath for uint32;
    using SafeMath for uint256;

    uint32 private constant SLOPE_DENOM = 1000000; // slope = m / SLOPE_DENOM
    uint32 private constant MAX_N = 3; // y = mx^n, n <= MAX_N
    uint32 private constant MAX_OWNER_FEE = 950; // 95.0%

    uint8 public constant platformFee = 50; // 5.0%
    address payable public constant platform = 0xAD10D4F9937D743cbEb1383B1D3A3AD15Ace75D6;

    uint32 public m = SLOPE_DENOM;
    uint32 public n = 1;
    uint32 public ownerFee = 0;
    address payable public pairOwner = platform;
    uint256 public maxSupply = 1;
    uint256 public ethReserve = 0;
    uint256 public x = 1; // initial supply must be at least 1
    uint256 public closeDeadline = 0;
    uint256 public ownerFees = 0;
    uint256 public platformFees = 0;
    uint256[] public nftReservePool; // append sold token ids and resell before minting
    uint256 public nftReservePoolIndex = 0; // keep track of the next token id to sell from the pool

    // opensea compatible
    address public proxyRegistryAddress;

    uint256 private currentTokenId = 0;


    /**
    * @dev Create the NFT contract from name symbol and baseURI
    */
    constructor(
        string memory _name,
        string memory _symbol,
        string memory _baseTokenURI,
        address _proxyAddress,
        address payable _pairOwner,
        uint256 _maxSupply,
        uint256 _initX,
        uint32 _m,
        uint32 _n,
        uint32 _ownerFee
    ) ERC721(_name, _symbol) {
        require(_initX > 0, 'ZERO_INIT_X');
        require(_m > 0 && _m <= SLOPE_DENOM, 'INVALID_M');
        require(_n > 0 && _n <= MAX_N, 'INVALID_N');
        require(_ownerFee <= MAX_OWNER_FEE, 'INVALID_OWNER_FEE');
        priceAtX(_initX.add(_maxSupply)); // will revert if overflow
        _setBaseURI(_baseTokenURI);
        maxSupply = _maxSupply;
        proxyRegistryAddress = _proxyAddress;
        pairOwner = _pairOwner;
        x = _initX;
        m = _m;
        n = _n;
        ownerFee = _ownerFee;
    }

    function preMint(uint256 _count, address _to) external override {
        require(msg.sender == pairOwner, 'OWNER_ONLY');
        require(totalSupply() + _count <= maxSupply, 'MAX_SUPPLY');
        require(ethReserve == 0 && nftReservePool.length == 0, 'MARKET_OPEN');
        for (uint256 i = 0; i < _count; i++) {
            uint256 newTokenId = _getNextTokenId();
            _mint(_to, newTokenId);
            _incrementTokenId();
        }
        emit PreMint(_count, _to);
    }

    function nftReservePoolLength() external view returns (uint) {
        return nftReservePool.length;
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

    function buy(address payable _to) external payable override returns (uint256 tokenId) {
        require(closeDeadline == 0 || block.timestamp < closeDeadline, 'MARKET_CLOSED');
        uint basePrice = priceAtX(x);
        // Determine if we can sell a token id from the reserve pool
        if (nftReservePoolIndex < nftReservePool.length) {
            tokenId = nftReservePool[nftReservePoolIndex];
            require(_isApprovedOrOwner(address(this), tokenId), 'UNAPPROVED_BUY');
             _transfer(address(this), _to, tokenId);
            nftReservePoolIndex++;
        } else {
            // Mint a new token to the recipient
            tokenId = _getNextTokenId();
            require(tokenId <= maxSupply, 'MAX_SUPPLY');
            _mint(_to, tokenId);
            _incrementTokenId();
        }
        // calculate fees,
        uint platformShare = basePrice.mul(platformFee).div(1000);
        uint ownerShare = basePrice.mul(ownerFee).div(1000);
        platformFees = platformFees.add(platformShare);
        ownerFees = ownerFees.add(ownerShare);
        // Update ETH reserve
        ethReserve = ethReserve.add(basePrice);
        // Update X
        x = x + 1;
        // check value vs purchase price, and refund if necessary
        uint purchasePrice = basePrice.add(platformShare).add(ownerShare);
        require(msg.value >= purchasePrice, 'INSUFFICIENT_FUNDS');
        // Refund excess ETH
        if (msg.value > purchasePrice) {
            _to.transfer(msg.value.sub(purchasePrice));
        }
        emit Buy(msg.sender, purchasePrice, tokenId, _to);
    }

    function sell(uint256 _tokenId, address payable _to) external override {
        require(closeDeadline == 0 || block.timestamp < closeDeadline, 'MARKET_CLOSED');
        require(x > 1, 'INVALID_X');
        uint salesPrice = priceAtX(x - 1);
        require(ethReserve >= salesPrice, 'INSUFFICIENT_RESERVE');
        // Send the token to this contract and add to reserve pool
        require(_isApprovedOrOwner(msg.sender, _tokenId), 'UNAPPROVED_SELL');
        _transfer(msg.sender, address(this), _tokenId);
        nftReservePool.push(_tokenId);
        // Calculate fees
        uint platformShare = salesPrice.mul(platformFee).div(1000);
        uint ownerShare = salesPrice.mul(ownerFee).div(1000);
        platformFees = platformFees.add(platformShare);
        ownerFees = ownerFees.add(ownerShare);
        // deduct fees from sales proceeds
        uint saleProceeds = salesPrice.sub(platformShare).sub(ownerShare);
        // Transfer sale proceeds
        _to.transfer(saleProceeds);
        // Update ETH reserve
        ethReserve = ethReserve.sub(salesPrice);
        // Update X
        x = x - 1;
        emit Sell(msg.sender, saleProceeds, _tokenId, _to);
    }

    function priceAtX(uint256 _x) public view returns (uint256) {
        return m.mul( (_x ** n).mul(10 ** 18) ).div(SLOPE_DENOM);
    }

    /**
    * @dev Returns the current buy price of a single NFT, including fees
    */
    function buyPrice() public view override returns (uint256) {
        uint256 basePrice = priceAtX(x);
        uint platformShare = basePrice.mul(platformFee).div(1000);
        uint ownerShare = basePrice.mul(ownerFee).div(1000);
        return basePrice.add(platformShare).add(ownerShare);
    }

    /**
    * @dev Returns the current sell proceeds of a single NFT, including fees
    */
    function sellPrice() public view override returns (uint256) {
        uint256 basePrice = priceAtX(x - 1);
        uint platformShare = basePrice.mul(platformFee).div(1000);
        uint ownerShare = basePrice.mul(ownerFee).div(1000);
        return basePrice.sub(platformShare).sub(ownerShare);
    }
}
