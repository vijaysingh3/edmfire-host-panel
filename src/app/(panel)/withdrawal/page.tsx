import ComingSoonPage from '@/components/ComingSoonPage';

export default function WithdrawalPage() {
  return (
    <ComingSoonPage
      title="Withdraw Coins"
      description="Withdraw your coins to UPI, Paytm, or bank account"
      step={0}
      color="from-yellow-500 to-amber-600"
      icon="📤"
    />
  );
}
