import React, { useState } from "react";
import { formatCurrency } from "../../utils/formatters";
import { calculateSplitModelEarnings, calculatePlatformFeeModel } from "../../utils/feeCalculator";

export function PaymentPage({ patientData, onPaymentSuccess }) {
  const doctor = patientData.doctor;
  const isSplitModel = doctor.pricingModel === "SPLIT";
  const [processing, setProcessing] = useState(false);

  const feeDetails = isSplitModel
    ? calculateSplitModelEarnings(doctor.patientFee, doctor.doctorSharePercentage)
    : calculatePlatformFeeModel(doctor.doctorClinicFee, doctor.platformFee);

  const payableAmount = isSplitModel ? feeDetails.patientFee : feeDetails.platformFee;

  const handlePayNow = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      onPaymentSuccess({
        transactionId: `TXN${Math.floor(Math.random() * 90000000 + 10000000)}`,
        paidAmount: payableAmount
      });
    }, 1200);
  };

  return (
    <div className="patient-flow-container">
      <div className="step-banner">
        <span className="step-number">Step 3 of 5</span>
        <h2>💳 Program Access Checkout</h2>
        <p>Doctor-specific pricing & secure online payment activation (SRS Section 22 & 24)</p>
      </div>

      <div className="checkout-grid">
        <div className="order-summary-box">
          <h3>Order Summary</h3>
          <div className="summary-row">
            <span>Assigned Program:</span>
            <strong>14-Day Recovery Plan</strong>
          </div>
          <div className="summary-row">
            <span>Referring Doctor:</span>
            <strong>{doctor.name} ({doctor.clinicName})</strong>
          </div>
          <div className="summary-row">
            <span>Pricing Model:</span>
            <span className="badge-pill blue">
              {isSplitModel ? "Split Model" : "Platform Fee Model"}
            </span>
          </div>

          {!isSplitModel && (
            <div className="info-notice">
              ℹ️ Doctor's clinic fee (₹{doctor.doctorClinicFee}) is collected directly at clinic. You are paying ₹{doctor.platformFee} online for app exercise video access.
            </div>
          )}

          <hr />

          <div className="summary-row total">
            <span>Total Payable Amount:</span>
            <strong>{formatCurrency(payableAmount)}</strong>
          </div>
        </div>

        <div className="payment-options-box">
          <h3>Select Payment Method</h3>
          <div className="payment-methods">
            <label className="payment-radio selected">
              <input type="radio" name="payMethod" defaultChecked />
              <span>📱 UPI (GPay / PhonePe / Paytm)</span>
            </label>
            <label className="payment-radio">
              <input type="radio" name="payMethod" />
              <span>💳 Debit / Credit Card</span>
            </label>
            <label className="payment-radio">
              <input type="radio" name="payMethod" />
              <span>🏦 Net Banking</span>
            </label>
          </div>

          <button
            className="primary-action-btn large green"
            onClick={handlePayNow}
            disabled={processing}
          >
            {processing ? "Processing Payment..." : `Pay ${formatCurrency(payableAmount)} & Activate Program`}
          </button>
        </div>
      </div>
    </div>
  );
}
