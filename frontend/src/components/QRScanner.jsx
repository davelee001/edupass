import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { parseQRData, isValidPublicKey } from '../utils/qrCodeUtils';

/**
 * QR Code Scanner Component
 * Scans QR codes using device camera and parses the data
 */
const QRScanner = ({ onScan, onError, onClose }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    startScanner();

    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = () => {
    if (scannerRef.current && !html5QrCodeRef.current) {
      html5QrCodeRef.current = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        false
      );

      html5QrCodeRef.current.render(onScanSuccess, onScanFailure);
      setIsScanning(true);
    }
  };

  const stopScanner = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.clear().catch(console.error);
      html5QrCodeRef.current = null;
      setIsScanning(false);
    }
  };

  const onScanSuccess = (decodedText, decodedResult) => {
    const parsed = parseQRData(decodedText);
    setParsedData(parsed);
    
    if (onScan) {
      onScan(parsed, decodedText);
    }
    
    stopScanner();
  };

  const onScanFailure = (error) => {
    // Scan failures are common (no QR in frame), only log errors
    if (onError && !error.includes('No MultiFormat Readers')) {
      onError(error);
    }
  };

  const handleClose = () => {
    stopScanner();
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="qr-scanner">
      <div className="scanner-header">
        <h3>📷 Scan QR Code</h3>
        <button className="close-btn" onClick={handleClose}>×</button>
      </div>

      <div className="scanner-body">
        <div id="qr-reader" ref={scannerRef}></div>

        {parsedData && (
          <div className="scan-result">
            <h4>✅ Scanned Successfully!</h4>
            <div className="result-details">
              <p><strong>Type:</strong> {parsedData.type}</p>
              
              {parsedData.type === 'stellar-uri' && (
                <>
                  <p><strong>Action:</strong> {parsedData.action}</p>
                  <p><strong>Destination:</strong> {parsedData.destination?.substring(0, 12)}...</p>
                  {parsedData.amount && <p><strong>Amount:</strong> {parsedData.amount}</p>}
                  {parsedData.memo && <p><strong>Memo:</strong> {parsedData.memo}</p>}
                  {parsedData.assetCode && <p><strong>Asset:</strong> {parsedData.assetCode}</p>}
                </>
              )}

              {parsedData.type === 'public-key' && (
                <p><strong>Public Key:</strong> {parsedData.publicKey}</p>
              )}

              {parsedData.type === 'json' && (
                <>
                  {parsedData.publicKey && <p><strong>Public Key:</strong> {parsedData.publicKey.substring(0, 12)}...</p>}
                  {parsedData.name && <p><strong>Name:</strong> {parsedData.name}</p>}
                  {parsedData.role && <p><strong>Role:</strong> {parsedData.role}</p>}
                </>
              )}

              {parsedData.type === 'transaction-url' && (
                <>
                  <p><strong>TX Hash:</strong> {parsedData.transactionHash?.substring(0, 16)}...</p>
                  <a href={parsedData.url} target="_blank" rel="noopener noreferrer" className="explorer-link">
                    View on Explorer →
                  </a>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .qr-scanner {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          max-width: 500px;
          width: 100%;
        }

        .scanner-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 2px solid #dee2e6;
        }

        .scanner-header h3 {
          margin: 0;
          font-size: 18px;
        }

        .close-btn {
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

        .close-btn:hover {
          color: #000;
        }

        .scanner-body {
          padding: 20px;
        }

        #qr-reader {
          width: 100%;
        }

        .scan-result {
          margin-top: 20px;
          padding: 16px;
          background: #d1e7dd;
          border: 2px solid #0f5132;
          border-radius: 8px;
        }

        .scan-result h4 {
          margin: 0 0 12px 0;
          color: #0f5132;
          font-size: 16px;
        }

        .result-details p {
          margin: 8px 0;
          font-size: 14px;
        }

        .result-details strong {
          color: #0f5132;
        }

        .explorer-link {
          display: inline-block;
          margin-top: 8px;
          color: #0d6efd;
          text-decoration: none;
          font-weight: 600;
        }

        .explorer-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

/**
 * QR Scanner Modal
 * Modal wrapper for QR scanner
 */
export const QRScannerModal = ({ isOpen, onClose, onScan, onError }) => {
  if (!isOpen) return null;

  return (
    <div className="qr-scanner-overlay" onClick={onClose}>
      <div className="qr-scanner-modal" onClick={(e) => e.stopPropagation()}>
        <QRScanner
          onScan={(parsed, raw) => {
            onScan && onScan(parsed, raw);
            setTimeout(() => onClose && onClose(), 2000); // Close after 2s
          }}
          onError={onError}
          onClose={onClose}
        />
      </div>

      <style jsx>{`
        .qr-scanner-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .qr-scanner-modal {
          max-width: 600px;
          width: 100%;
        }
      `}</style>
    </div>
  );
};

/**
 * Quick Scan Button
 * Button to trigger QR scanner
 */
export const QuickScanButton = ({ onScan, onError, buttonText = '📷 Scan QR', className = '' }) => {
  const [showScanner, setShowScanner] = useState(false);

  const handleScan = (parsed, raw) => {
    setShowScanner(false);
    if (onScan) {
      onScan(parsed, raw);
    }
  };

  return (
    <>
      <button
        className={`quick-scan-btn ${className}`}
        onClick={() => setShowScanner(true)}
      >
        {buttonText}
      </button>

      <QRScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScan}
        onError={onError}
      />

      <style jsx>{`
        .quick-scan-btn {
          padding: 10px 20px;
          background: #0d6efd;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .quick-scan-btn:hover {
          background: #0b5ed7;
        }
      `}</style>
    </>
  );
};

export default QRScanner;
export { QRScannerModal, QuickScanButton };
