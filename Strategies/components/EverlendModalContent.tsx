import ButtonGroup from '@components/ButtonGroup'
import { useEffect, useState } from 'react'
import { TreasuryStrategy } from 'Strategies/types/types'
import {
  calcUserTokenBalanceByPoolToken,
  CreateEverlendProposal,
  lamportsToSol,
} from 'Strategies/protocols/everlend/tools'
import { AssetAccount } from '@utils/uiTypes/assets'
import EverlendDeposit from './everlend/EverlendDeposit'
import EverlendWithdraw from './everlend/EverlendWithdraw'
import { findAssociatedTokenAccount } from '@everlend/common'
import { PublicKey } from '@solana/web3.js'
import useWalletStore from 'stores/useWalletStore'

enum Tabs {
  DEPOSIT = 'Deposit',
  WITHDRAW = 'Withdraw',
}

interface IProps {
  proposedInvestment: TreasuryStrategy & {
    poolMint: string
    rateEToken: number
    decimals: number
    poolPubKey: string
  }
  handledMint: string
  createProposalFcn: CreateEverlendProposal
  governedTokenAccount: AssetAccount
}

const EverlendModalContent = ({
  proposedInvestment,
  handledMint,
  createProposalFcn,
  governedTokenAccount,
}: IProps) => {
  const [selectedTab, setSelectedTab] = useState(Tabs.DEPOSIT)
  const [depositedAmount, setDepositedAmount] = useState(0)
  const [maxDepositAmount, setMaxDepositAmount] = useState(0)
  const tabs = Object.values(Tabs)
  const connection = useWalletStore((s) => s.connection)

  const isSol = governedTokenAccount.isSol
  const owner = isSol
    ? governedTokenAccount!.pubkey
    : governedTokenAccount!.extensions!.token!.account.owner

  useEffect(() => {
    const loadMaxAmount = async () => {
      console.log('owner', owner.toString())
      const poolMintATA = await findAssociatedTokenAccount(
        owner,
        new PublicKey(proposedInvestment.poolMint)
      )
      console.log('tokenmintata', poolMintATA.toString())
      let poolMintATABalance = 0
      let tokenMintATABalance = 0
      try {
        const fetchedTokenMintATABalance = await connection.current.getTokenAccountBalance(
          poolMintATA
        )

        poolMintATABalance = calcUserTokenBalanceByPoolToken(
          Number(fetchedTokenMintATABalance.value.uiAmount),
          proposedInvestment.decimals,
          proposedInvestment.rateEToken,
          false
        )
      } catch (e) {
        console.log(e)
      }
      try {
        if (isSol) {
          const fetchedBalance = await connection.current.getBalance(owner)
          tokenMintATABalance = lamportsToSol(fetchedBalance)
        } else {
          const fetchedBalance = await connection.current.getTokenAccountBalance(
            governedTokenAccount!.pubkey
          )
          tokenMintATABalance = Number(fetchedBalance.value.uiAmount)
        }
      } catch (e) {
        console.log(e)
      }
      setDepositedAmount(poolMintATABalance)
      setMaxDepositAmount(tokenMintATABalance)
    }
    loadMaxAmount()
  }, [proposedInvestment, handledMint])

  return (
    <div>
      <div className="pb-4">
        <ButtonGroup
          activeValue={selectedTab}
          onChange={(tab) => setSelectedTab(tab)}
          values={tabs}
        />
      </div>
      {selectedTab === Tabs.DEPOSIT && (
        <EverlendDeposit
          proposedInvestment={proposedInvestment}
          createProposalFcn={createProposalFcn}
          governedTokenAccount={governedTokenAccount}
          handledMint={handledMint}
          depositedAmount={depositedAmount}
          maxDepositAmount={maxDepositAmount}
        />
      )}
      {selectedTab === Tabs.WITHDRAW && (
        <EverlendWithdraw
          proposedInvestment={proposedInvestment}
          createProposalFcn={createProposalFcn}
          governedTokenAccount={governedTokenAccount}
          handledMint={handledMint}
          depositedAmount={depositedAmount}
        />
      )}
    </div>
  )
}

export default EverlendModalContent
