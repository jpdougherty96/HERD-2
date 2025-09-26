import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Shield, Lock, CreditCard, CheckCircle } from 'lucide-react';

type StripePaymentFormProps = {
  amount: number;
  onPaymentSubmit: (paymentData: {
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cvc: string;
    nameOnCard: string;
    email: string;
  }) => void;
  loading: boolean;
  onCancel: () => void;
  className?: string;
  user?: {
    name: string;
    email: string;
  };
};

export function StripePaymentForm({ 
  amount, 
  onPaymentSubmit, 
  loading, 
  onCancel,
  className = "",
  user
}: StripePaymentFormProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvc, setCvc] = useState('');
  const [nameOnCard, setNameOnCard] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const formatCardNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    // Add spaces every 4 digits
    const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    return formatted.slice(0, 19); // Max length with spaces
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setCardNumber(formatted);
  };

  const handleExpiryMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 2);
    if (parseInt(value) > 12) return;
    setExpiryMonth(value);
  };

  const handleExpiryYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setExpiryYear(value);
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCvc(value);
  };

  const isFormValid = () => {
    const cardDigits = cardNumber.replace(/\s/g, '');
    return (
      cardDigits.length >= 13 &&
      expiryMonth.length === 2 &&
      expiryYear.length === 4 &&
      cvc.length >= 3 &&
      nameOnCard.trim().length > 0 &&
      email.includes('@') &&
      parseInt(expiryMonth) >= 1 && parseInt(expiryMonth) <= 12 &&
      parseInt(expiryYear) >= new Date().getFullYear() &&
      acceptedTerms
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid() || loading) return;

    onPaymentSubmit({
      cardNumber: cardNumber.replace(/\s/g, ''),
      expiryMonth,
      expiryYear,
      cvc,
      nameOnCard: nameOnCard.trim(),
      email: email.trim()
    });
  };

  return (
    <div className={className}>
      <Card className="bg-[#ffffff] border-[#a8b892] shadow-xl">
        {/* Stripe Branding Header */}
        <CardHeader className="bg-gradient-to-r from-[#556B2F] to-[#3c4f21] text-[#f8f9f6]">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Secure Payment
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm opacity-90">Powered by</span>
              <div className="bg-white text-[#6772e5] px-3 py-1 rounded font-bold text-sm">
                stripe
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Stripe Security Notice */}
          <div className="mb-6 bg-gradient-to-r from-[#e8f5ff] to-[#f0f9ff] border border-[#3b82f6]/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="bg-[#3b82f6] rounded-full p-1 mt-0.5">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-[#1e40af] mb-2">Your payment is secure with Stripe</h4>
                <div className="grid md:grid-cols-2 gap-2 text-sm text-[#1e40af]">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    <span>256-bit SSL encryption</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    <span>PCI DSS Level 1 compliant</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    <span>Trusted by millions globally</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    <span>Bank-level security</span>
                  </div>
                </div>
                <p className="text-xs text-[#64748b] mt-2">
                  HERD uses Stripe to process payments securely. Your card details are never stored on our servers.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Amount Summary */}
            <div className="bg-[#f8f9f6] rounded-lg p-4 border border-[#a8b892]">
              <div className="flex justify-between items-center">
                <span className="text-[#3c4f21] font-medium">Total Amount:</span>
                <span className="text-2xl font-bold text-[#556B2F]">${amount.toFixed(2)}</span>
              </div>
              <p className="text-xs text-[#556B2F] mt-1">
                Processing fee included • Secure payment via Stripe
              </p>
            </div>

            {/* Email Address */}
            <div>
              <Label htmlFor="email" className="text-[#3c4f21]">
                Email Address
                {user?.email && (
                  <span className="text-xs text-[#556B2F] font-normal ml-2">(pre-filled from your account)</span>
                )}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F]"
                required
              />
              <p className="text-xs text-[#556B2F] mt-1">
                Receipt and booking confirmation will be sent to this email
              </p>
            </div>

            {/* Card Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-[#556B2F]" />
                <span className="font-medium text-[#3c4f21]">Card Information</span>
                <div className="flex gap-1 ml-auto">
                  <div className="w-8 h-5 bg-[#1a1f71] rounded text-white flex items-center justify-center text-xs font-bold">VISA</div>
                  <div className="w-8 h-5 bg-[#eb001b] rounded text-white flex items-center justify-center text-xs font-bold">MC</div>
                  <div className="w-8 h-5 bg-[#006fcf] rounded text-white flex items-center justify-center text-xs font-bold">AMEX</div>
                </div>
              </div>

              {/* Card Number */}
              <div>
                <Label htmlFor="cardNumber" className="text-[#3c4f21]">Card Number</Label>
                <Input
                  id="cardNumber"
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  className="mt-2 border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F] font-mono"
                  required
                />
              </div>

              {/* Expiry and CVC */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="expiryMonth" className="text-[#3c4f21]">Month</Label>
                  <Input
                    id="expiryMonth"
                    type="text"
                    placeholder="MM"
                    value={expiryMonth}
                    onChange={handleExpiryMonthChange}
                    className="mt-2 border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F] font-mono"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="expiryYear" className="text-[#3c4f21]">Year</Label>
                  <Input
                    id="expiryYear"
                    type="text"
                    placeholder="YYYY"
                    value={expiryYear}
                    onChange={handleExpiryYearChange}
                    className="mt-2 border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F] font-mono"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cvc" className="text-[#3c4f21]">CVC</Label>
                  <Input
                    id="cvc"
                    type="text"
                    placeholder="123"
                    value={cvc}
                    onChange={handleCvcChange}
                    className="mt-2 border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F] font-mono"
                    required
                  />
                </div>
              </div>

              {/* Name on Card */}
              <div>
                <Label htmlFor="nameOnCard" className="text-[#3c4f21]">
                  Name on Card
                  {user?.name && (
                    <span className="text-xs text-[#556B2F] font-normal ml-2">(pre-filled from your account)</span>
                  )}
                </Label>
                <Input
                  id="nameOnCard"
                  type="text"
                  placeholder="John Doe"
                  value={nameOnCard}
                  onChange={(e) => setNameOnCard(e.target.value)}
                  className="mt-2 border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F]"
                  required
                />
              </div>
            </div>

            {/* Terms Acceptance */}
            <div className="flex items-start gap-3 p-4 bg-[#f8f9f6] rounded-lg border border-[#a8b892]">
              <input
                type="checkbox"
                id="acceptTerms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1"
                required
              />
              <div className="flex-1">
                <label htmlFor="acceptTerms" className="text-sm text-[#3c4f21] cursor-pointer">
                  I agree to the booking terms and authorize HERD to charge my card via Stripe for this booking. 
                  I understand that cancellation policies apply as outlined in the class details.
                </label>
              </div>
            </div>

            {/* Stripe Security Footer */}
            <div className="flex items-center justify-center gap-2 text-sm text-[#64748b] bg-[#f8fafc] p-3 rounded-lg border border-[#e2e8f0]">
              <Lock className="w-4 h-4" />
              <span>
                Secured by <strong className="text-[#6772e5]">Stripe</strong> • 
                Your card details are encrypted and never stored by HERD
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
                className="flex-1 border-[#a8b892] text-[#556B2F] hover:bg-[#f8f9f6]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid() || loading}
                className="flex-1 bg-[#556B2F] hover:bg-[#3c4f21] text-[#f8f9f6] font-semibold"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing via Stripe...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span>Pay ${amount.toFixed(2)} Securely</span>
                  </div>
                )}
              </Button>
            </div>

            {/* Payment Method Info */}
            <div className="text-center">
              <p className="text-xs text-[#64748b]">
                By completing this payment, you agree that your card will be charged ${amount.toFixed(2)} through Stripe's secure payment processing system.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}