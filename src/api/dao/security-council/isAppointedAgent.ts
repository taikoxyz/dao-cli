import { isAddressEqual } from "viem";
import { INetworkConfig } from "../../../types/network.type";
import getSecurityCouncilMembers from "./getSecurityCouncilMembers";

export default async function isSecurityCouncilMember(
  address: `0x${string}`,
  config: INetworkConfig,
): Promise<boolean> {
  const members = await getSecurityCouncilMembers(config);
  return members.some(m => isAddressEqual(m.signer, address))
}