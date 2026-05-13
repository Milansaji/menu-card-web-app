import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Card from '../../components/Card';
import { Save, Building2, Receipt, Volume2, CheckCircle2, Play } from 'lucide-react';
import { playSound } from '../../utils/audio';

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [settings, setSettings] = useState({
    restaurantName: '',
    logoUrl: '',
    address: '',
    phone: '',
    gstin: '',
    gstMode: 'exclusive', // 'inclusive' or 'exclusive'
    notificationSound: 'bell' // 'bell', 'siren', 'digital', 'chime'
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data());
        }
      } catch (error) {
        console.error(error);
        toast.error('Failed to load settings');
      } finally {
        setFetching(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await setDoc(doc(db, 'settings', 'config'), settings);
      toast.success('Settings updated successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="p-8 text-center animate-pulse">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Configure your restaurant details and billing preferences.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Restaurant Details */}
        <Card className="space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
            <Building2 className="text-indigo-600" size={24} />
            <h2 className="text-xl font-bold">Restaurant Details</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Restaurant Name"
              name="restaurantName"
              value={settings.restaurantName}
              onChange={handleChange}
              placeholder="e.g. Spice Route"
              required
            />
            <Input
              label="Hotel Logo URL"
              name="logoUrl"
              value={settings.logoUrl}
              onChange={handleChange}
              placeholder="https://example.com/logo.png"
            />
            <Input
              label="Phone Number"
              name="phone"
              value={settings.phone}
              onChange={handleChange}
              placeholder="e.g. +91 98765 43210"
              required
            />
            <div className="md:col-span-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Address</label>
                <textarea
                  name="address"
                  value={settings.address}
                  onChange={handleChange}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                  placeholder="Full street address..."
                  required
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Billing & GST Details */}
        <Card className="space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
            <Receipt className="text-indigo-600" size={24} />
            <h2 className="text-xl font-bold">Billing & GST</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="GSTIN Number"
              name="gstin"
              value={settings.gstin}
              onChange={handleChange}
              placeholder="e.g. 22AAAAA0000A1Z5"
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">GST Mode</label>
              <div className="flex gap-4 p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, gstMode: 'exclusive' }))}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                    settings.gstMode === 'exclusive' 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Exclusive
                </button>
                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, gstMode: 'inclusive' }))}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                    settings.gstMode === 'inclusive' 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Inclusive
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {settings.gstMode === 'exclusive' 
                  ? 'Base Price + (Base Price * GST%) = Total' 
                  : 'Base Price = Total / (1 + GST%)'}
              </p>
            </div>
          </div>
        </Card>

        {/* Notification Audio */}
        <Card className="space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
            <Volume2 className="text-indigo-600" size={24} />
            <h2 className="text-xl font-bold">Notification Audio</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { id: 'bell', name: 'Kitchen Bell', icon: '🔔' },
              { id: 'siren', name: 'Emergency Siren', icon: '🚨' },
              { id: 'digital', name: 'Digital Ping', icon: '📱' },
              { id: 'chime', name: 'Modern Chime', icon: '🎵' }
            ].map((sound) => (
              <div
                key={sound.id}
                onClick={() => setSettings(prev => ({ ...prev, notificationSound: sound.id }))}
                className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 relative cursor-pointer group ${
                  settings.notificationSound === sound.id
                    ? 'border-indigo-600 bg-indigo-50 shadow-xl shadow-indigo-100 ring-4 ring-indigo-50'
                    : 'border-gray-100 bg-white hover:border-indigo-300'
                }`}
              >
                <span className="text-3xl">{sound.icon}</span>
                <span className={`text-xs font-black uppercase tracking-wider ${
                  settings.notificationSound === sound.id ? 'text-indigo-600' : 'text-gray-400'
                }`}>
                  {sound.name}
                </span>
                
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playSound(sound.id);
                  }}
                  className="mt-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all active:scale-90 shadow-lg shadow-indigo-100"
                >
                  <Play size={12} fill="currentColor" />
                </button>

                {settings.notificationSound === sound.id && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                    <CheckCircle2 size={12} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        <div className="flex justify-end">
          <Button 
            type="submit" 
            className="flex items-center gap-2 px-8 py-3"
            disabled={loading}
          >
            <Save size={20} />
            {loading ? 'Saving...' : 'Save All Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
