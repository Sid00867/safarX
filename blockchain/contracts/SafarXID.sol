// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract SafarXID {
    struct Tourist {
        string name;
        string phoneHash;
        uint256 createdAt;
    }

    mapping(address => Tourist) public tourists;

    event TouristRegistered(address indexed user, string name, uint256 createdAt);

    function registerTourist(string memory _name, string memory _phoneHash) public {
        require(bytes(tourists[msg.sender].name).length == 0, "Already registered");
        tourists[msg.sender] = Tourist({
            name: _name,
            phoneHash: _phoneHash,
            createdAt: block.timestamp
        });
        emit TouristRegistered(msg.sender, _name, block.timestamp);
    }

    function getTourist(address _user) public view returns (string memory, string memory, uint256) {
        Tourist memory t = tourists[_user];
        return (t.name, t.phoneHash, t.createdAt);
    }
}
