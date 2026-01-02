/**
 * Affiliate IDs Configuration
 * 
 * Add your referral IDs for each exchange platform.
 * These will be used to auto-generate affiliate tasks.
 */

export const AFFILIATE_IDS = {
  binance: 'CPA_00FRB53AQ8',
  bybit: 'NZOPWR',
  bingx: 'FGVYPF',
  okx: 'YOUR_OKX_ID',
  mexc: 'YOUR_MEXC_ID',
  kucoin: 'QBSW8Y62',
  gate: 'YOUR_GATE_ID',
  bitget: 'YOUR_BITGET_ID',
  htx: 'YOUR_HTX_ID'
  // Add more exchanges as needed...
} as const;

export type ExchangeKey = keyof typeof AFFILIATE_IDS;

/**
 * Task Templates for each exchange
 * 
 * Each template defines the task details that will be created.
 * {ID} will be replaced with the actual affiliate ID.
 */
export interface TaskTemplate {
  title: string;
  description: string;
  reward: number;
  linkTemplate: string;
  icon: string;
  type: string;
}

export const AFFILIATE_TASK_TEMPLATES: Record<ExchangeKey, TaskTemplate[]> = {
  binance: [
    {
      title: 'Register on Binance',
      description: 'Create a new account on Binance - the world\'s largest crypto exchange',
      reward: 2500,
      linkTemplate: 'https://www.binance.com/activity/referral-entry/CPA?ref={ID}',
      icon: 'other',
      type: 'exchange',
    },
  ],
  bybit: [
    {
      title: 'Register on Bybit',
      description: 'Sign up on Bybit - leading crypto derivatives exchange',
      reward: 2000,
      linkTemplate: 'https://www.bybit.com/invite?ref={ID}',
      icon: 'other',
      type: 'exchange',
    },
  ],
  bingx: [
    {
      title: 'Register on BingX',
      description: 'Join BingX - social trading crypto exchange with copy trading',
      reward: 2000,
      linkTemplate: 'https://iciclebridge.com/invite/{ID}/',
      icon: 'other',
      type: 'exchange',
    },
  ],
  okx: [
    {
      title: 'Register on OKX',
      description: 'Create an account on OKX - top crypto exchange for trading',
      reward: 2000,
      linkTemplate: 'https://www.okx.com/join/{ID}',
      icon: 'other',
      type: 'exchange',
    },
  ],
  mexc: [
    {
      title: 'Register on MEXC',
      description: 'Sign up on MEXC - global crypto exchange with 1500+ tokens',
      reward: 1500,
      linkTemplate: 'https://www.mexc.com/register?inviteCode={ID}',
      icon: 'other',
      type: 'exchange',
    },
  ],
  kucoin: [
    {
      title: 'Register on KuCoin',
      description: 'Join KuCoin - the People\'s Exchange with 700+ coins',
      reward: 1500,
      linkTemplate: 'https://www.kucoin.com/r/rf/{ID}',
      icon: 'other',
      type: 'exchange',
    },
  ],
  gate: [
    {
      title: 'Register on Gate.io',
      description: 'Create an account on Gate.io - secure crypto exchange',
      reward: 1500,
      linkTemplate: 'https://www.gate.io/signup/{ID}',
      icon: 'other',
      type: 'exchange',
    },
  ],
  bitget: [
    {
      title: 'Register on Bitget',
      description: 'Sign up on Bitget - crypto derivatives and copy trading',
      reward: 1500,
      linkTemplate: 'https://www.bitget.com/referral/register?from=referral&clacCode={ID}',
      icon: 'other',
      type: 'exchange',
    },
  ],
  htx: [
    {
      title: 'Register on HTX',
      description: 'Join HTX (formerly Huobi) - trusted crypto exchange',
      reward: 1500,
      linkTemplate: 'https://www.htx.com/invite/en-us/1f?invite_code={ID}',
      icon: 'other',
      type: 'exchange',
    },
  ],
};
