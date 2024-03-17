// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../interfaces/IOracle.sol";

/**
 * @title Mock oracle
 */
contract MockBTCPriceFeedOracle is IOracle {
    uint256 private wBTCPrice;

    /**
     * Return mocked data returned by the oracle
     */
    function getLatestPrice() external view override returns (uint256) {
        return wBTCPrice;
    }

    /**
    * Sets the wBTCPrice
    */
    function setWBTCPrice(uint256 _wBTCPrice) external {
        wBTCPrice = _wBTCPrice;
    }

}