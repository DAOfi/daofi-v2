// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;

interface IDAOfiV2Pair {
    event SetPairOwner(address indexed sender, address indexed newOwner);
    event SignalClose(address indexed sender, uint256 deadline);
    event Close(address indexed sender, uint256 amount);
    event WithdrawOwnerFees(address indexed sender, uint256 amount);
    event WithdrawPlatformFees(address indexed sender, uint256 amount);
    event Buy(
        address indexed sender,
        uint256 amountIn,
        uint256 tokenId,
        address indexed to
    );
    event Sell(
        address indexed sender,
        uint256 amountOut,
        uint256 tokenId,
        address indexed to
    );
    function price() external view returns (uint256);
    function setPairOwner(address payable) external;
    function signalClose() external;
    function close() external;
    function withdrawOwnerFees() external;
    function withdrawPlatformFees() external;
    function buy(address payable to) external;
    function sell(address payable to) external;
}
