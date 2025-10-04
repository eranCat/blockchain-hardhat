// hardhat.d.ts
import "hardhat/types/config";
import "hardhat/types/runtime";

declare module "hardhat/types/runtime" {
    interface HardhatRuntimeEnvironment {
        viem: any;
    }
}