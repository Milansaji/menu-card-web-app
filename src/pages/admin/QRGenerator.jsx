import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../../firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Copy, Download, QrCode, Store, Hash } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Button from '../../components/Button';

import logo from '../../assets/logo.webp';

const QRGenerator = () => {
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantId, setRestaurantId] = useState('main'); 
  const [tableNumber, setTableNumber] = useState('');
  const [copied, setCopied] = useState(false);
  const [logoDataUri, setLogoDataUri] = useState('');
  const qrRef = useRef();

  useEffect(() => {
    // Convert logo to data URI for reliable SVG serialization
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      setLogoDataUri(canvas.toDataURL('image/png'));
    };
    img.src = logo;

    const fetchSettings = async () => {
      const docSnap = await getDoc(doc(db, 'settings', 'config'));
      if (docSnap.exists()) {
        setRestaurantName(docSnap.data().restaurantName);
      }
    };
    fetchSettings();
  }, []);

  const menuUrl = `${window.location.origin}/menu/${restaurantId}${tableNumber ? `?table=${tableNumber}` : ''}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    const svg = document.getElementById('qr-code-svg');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR_Table_${tableNumber || 'Menu'}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    // Use a higher scale for better print quality
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">QR Menu Generator</h1>
        <p className="text-gray-500 mt-1">Generate unique QR codes for every table in your restaurant.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card className="space-y-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Store className="text-indigo-600" size={20} />
              Restaurant Details
            </h3>
            <Input 
              label="Restaurant Name" 
              value={restaurantName} 
              readOnly 
              className="bg-gray-50"
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Table Number (Optional)</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="e.g. 5"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-gray-900"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Leave blank for a general menu QR code.</p>
            </div>
          </Card>

          <Card className="bg-indigo-50 border-none">
            <h3 className="font-bold text-indigo-900 mb-2">How it works</h3>
            <ul className="text-sm text-indigo-700 space-y-2 list-disc pl-4">
              <li>Enter a table number to create a table-specific QR code.</li>
              <li>When customers scan it, the table number is automatically captured.</li>
              <li>You can download the QR code as a PNG to print for your tables.</li>
            </ul>
          </Card>
        </div>

        <div className="flex flex-col items-center justify-center space-y-6">
          <div className="p-8 bg-white rounded-3xl shadow-2xl shadow-indigo-100 border border-indigo-50 relative group">
            <div className="absolute inset-0 bg-indigo-600 opacity-0 group-hover:opacity-5 transition-opacity rounded-3xl" />
            <QRCodeSVG 
              id="qr-code-svg"
              value={menuUrl} 
              size={240}
              level="H"
              includeMargin={true}
                imageSettings={{
                  src: logoDataUri || logo,
                  height: 60,
                  width: 60,
                  excavate: true,
                }}
              />
            {tableNumber && (
              <div className="mt-4 text-center">
                <span className="px-4 py-1 bg-indigo-600 text-white text-sm font-black rounded-full">
                  TABLE {tableNumber}
                </span>
              </div>
            )}
          </div>

          <div className="w-full space-y-3">
            <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-xl text-sm font-medium text-gray-600 break-all border border-gray-200">
              <span className="flex-1 truncate">{menuUrl}</span>
              <button 
                onClick={copyToClipboard}
                className="p-2 hover:bg-white rounded-lg transition-colors text-indigo-600"
              >
                <Copy size={18} />
              </button>
            </div>
            
            <Button onClick={downloadQR} className="w-full flex items-center justify-center gap-2 py-4 shadow-lg shadow-indigo-100">
              <Download size={20} />
              Download QR Code
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRGenerator;
