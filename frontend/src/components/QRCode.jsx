import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  generateReceiveQRData,
  generatePaymentQRData,
  generateTransactionQRData,
  generateAccountQRData,
  generateQRFilename
} from '../utils/qrCodeUtils';

/**
 * Generic QR Code Display Component
 * Displays a QR code with download capability
 */
export const QRCodeDisplay = ({ value, size = 256, level = 'M', title, description, downloadFilename }) => {
  const qrRef = useRef(null);

  const handleDownload = () => {
    const svg = qrRef.current.querySelector('svg');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = size;
    canvas.height = size;

    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = downloadFilename || 'qrcode.png';
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    alert('QR data copied to clipboard!');
  };

  return (
    <div className="qr-code-display">
      {title && <h3 className="qr-title">{title}</h3>}
      {description && <p className="qr-description">{description}</p>}
      
      <div className="qr-code-container" ref={qrRef}>
        <QRCodeSVG
          value={value}
          size={size}
          level={level}
          includeMargin={true}
        />
      </div>

      <div className="qr-actions">
        <button onClick={handleDownload} className="btn btn-secondary btn-sm">
          📥 Download QR
        </button>
        <button onClick={handleCopy} className="btn btn-secondary btn-sm">
          📋 Copy Data
        </button>
      </div>

      <style jsx>{`
        .qr-code-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .qr-title {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 600;
        }

        .qr-description {
          margin: 0 0 16px 0;
          color: #6c757d;
          font-size: 14px;
          text-align: center;
        }

        .qr-code-container {
          padding: 16px;
          background: white;
          border: 2px solid #dee2e6;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .qr-actions {
          display: flex;
          gap: 12px;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover {
          background: #5c636a;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};

/**
 * Receive Credits QR Code
 * Shows QR for students to receive EDUPASS credits
 */
export const ReceiveQRCode = ({ publicKey, assetCode = 'EDUPASS', assetIssuer, studentName }) => {
  const qrData = generateReceiveQRData(publicKey, assetCode, assetIssuer);
  const filename = generateQRFilename('receive', publicKey);

  return (
    <QRCodeDisplay
      value={qrData}
      size={300}
      title={`Receive ${assetCode} Credits`}
      description={
        studentName 
          ? `${studentName}'s wallet - Scan to send credits`
          : 'Scan this QR code to send credits to this account'
      }
      downloadFilename={filename}
    />
  );
};

/**
 * Payment Request QR Code
 * Schools generate QR for specific payment requests
 */
export const PaymentRequestQRCode = ({ destination, amount, memo, assetCode = 'EDUPASS', assetIssuer, schoolName }) => {
  const qrData = generatePaymentQRData({ destination, amount, memo, assetCode, assetIssuer });
  const filename = generateQRFilename('payment', destination);

  return (
    <QRCodeDisplay
      value={qrData}
      size={300}
      title="Payment Request"
      description={
        <>
          <strong>{schoolName || 'School'}</strong> requests <strong>{amount} {assetCode}</strong>
          {memo && <><br />{memo}</>}
        </>
      }
      downloadFilename={filename}
    />
  );
};

/**
 * Transaction Receipt QR Code
 * Links to transaction on Stellar explorer
 */
export const TransactionQRCode = ({ transactionHash, network = 'testnet', amount, purpose }) => {
  const qrData = generateTransactionQRData(transactionHash, network);
  const filename = generateQRFilename('transaction', transactionHash);

  return (
    <QRCodeDisplay
      value={qrData}
      size={256}
      title="Transaction Receipt"
      description={
        <>
          {amount && purpose && (
            <>
              <strong>{amount}</strong> - {purpose}
              <br />
            </>
          )}
          Scan to view on Stellar Explorer
          <br />
          <span style={{ fontSize: '11px', fontFamily: 'monospace' }}>
            {transactionHash.substring(0, 16)}...
          </span>
        </>
      }
      downloadFilename={filename}
    />
  );
};

/**
 * Account Sharing QR Code
 * Share public key with optional metadata
 */
export const AccountQRCode = ({ publicKey, name, role, email }) => {
  const metadata = { name, role, email };
  const qrData = generateAccountQRData(publicKey, metadata);
  const filename = generateQRFilename('account', publicKey);

  return (
    <QRCodeDisplay
      value={qrData}
      size={256}
      title="Share Account"
      description={
        <>
          {name && <><strong>{name}</strong><br /></>}
          {role && <>{role}<br /></>}
          Public Key: {publicKey.substring(0, 8)}...{publicKey.substring(48)}
        </>
      }
      downloadFilename={filename}
    />
  );
};

/**
 * QR Code Modal
 * Modal wrapper for displaying QR codes
 */
export const QRCodeModal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="qr-modal-overlay" onClick={onClose}>
      <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="qr-modal-close" onClick={onClose}>×</button>
        {children}
      </div>

      <style jsx>{`
        .qr-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .qr-modal-content {
          position: relative;
          background: white;
          border-radius: 12px;
          padding: 24px;
          max-width: 90%;
          max-height: 90%;
          overflow: auto;
        }

        .qr-modal-close {
          position: absolute;
          top: 12px;
          right: 12px;
          background: none;
          border: none;
          font-size: 32px;
          cursor: pointer;
          color: #6c757d;
          line-height: 1;
          padding: 0;
          width: 32px;
          height: 32px;
        }

        .qr-modal-close:hover {
          color: #000;
        }
      `}</style>
    </div>
  );
};

export default {
  QRCodeDisplay,
  ReceiveQRCode,
  PaymentRequestQRCode,
  TransactionQRCode,
  AccountQRCode,
  QRCodeModal
};
