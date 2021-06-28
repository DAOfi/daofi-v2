// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import 'hardhat/console.sol';
import "./interfaces/IDAOfiV2NFT.sol";

contract OwnableDelegateProxy {}

contract ProxyRegistry {
    mapping(address => OwnableDelegateProxy) public proxies;
}

contract DAOfiV2NFT is IDAOfiV2NFT, ERC721 {
    using SafeMath for uint256;

    uint256 public override preMintSupply = 0;
    uint256 public override maxSupply = 0;
    address payable public override ownerAddress;
    uint256 private currentTokenId = 0;

    // opensea compat
    address public proxyRegistryAddress;

    /**
    * @dev Create the NFT contract from name symbol and baseURI
    */
    constructor(
        string memory _name,
        string memory _symbol,
        string memory _baseTokenURI,
        address payable _ownerAddress,
        address _proxyAddress,
        uint256 _maxSupply
    ) ERC721(_name, _symbol) {
        require(keccak256(bytes(_baseTokenURI)) != keccak256(bytes("")), "EMPTY_URI");
        require(_ownerAddress != address(0), "ZERO_OWNER");
        require(_proxyAddress != address(0), "ZERO_PROXY");
        require(_maxSupply > 0, "ZERO_SUPPLY");
        _setBaseURI(_baseTokenURI);
        ownerAddress = _ownerAddress;
        proxyRegistryAddress = _proxyAddress;
        maxSupply = _maxSupply;
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
    * @dev Function to allow pair to mint new tokenId to recipient
    */
    function mint(address _to) external override returns (uint256) {
        require(msg.sender == ownerAddress, "OWNER_ONLY");
        uint256 newTokenId = _getNextTokenId();
        require(newTokenId <= maxSupply, "MAX_MINT");
        _mint(_to, newTokenId);
        _incrementTokenId();
        return newTokenId;
    }

    function preMint(address _to, uint256 _count) external override {
        require(msg.sender == ownerAddress, "OWNER_ONLY");
        require(preMintSupply == 0, "DOUBLE_PREMINT");
        require(currentTokenId == 0, "PREMINT_UNAVAILABLE");
        require(_count <= maxSupply, "PREMINT_EXCESS");
        preMintSupply = _count;
        for (uint256 i = 0; i < _count; i++) {
            uint256 newTokenId = _getNextTokenId();
            _mint(_to, newTokenId);
            _incrementTokenId();
        }
        emit PreMint(_to, _count);
    }

    /**
    * @dev Transfer ownership of the NFT mint functionality
    */
    function setOwner(address payable _nextOwner) external {
        require(msg.sender == ownerAddress, "OWNER_ONLY");
        require(_nextOwner != address(0), "ZERO_OWNER");
        ownerAddress = _nextOwner;
        emit SetOwner(msg.sender, ownerAddress);
    }
}
