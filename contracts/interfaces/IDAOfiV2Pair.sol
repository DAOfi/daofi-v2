// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;

interface IDAOfiV2Pair {
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
    function buyPrice() external view returns (uint256);
    function sellPrice() external view returns (uint256);
    function signalClose() external;
    function close() external;
    function withdrawOwnerFees() external;
    function withdrawPlatformFees() external;
    function buy(address payable to) external payable returns (uint256);
    function sell(uint256 tokenId, address payable to) external;
}
