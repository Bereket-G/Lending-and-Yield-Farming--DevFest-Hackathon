// SPDX-License-Identifier: GPL-3.0-or-later

interface IOracle {
    function getLatestPrice() external view returns (uint256);
}