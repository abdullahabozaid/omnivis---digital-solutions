import React, { useState } from 'react';
import { Plus, X, Palette, Type, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { BrandGuidelines, BrandColor, BrandTypography } from '../types';

interface BrandGuidelinesEditorProps {
  value: BrandGuidelines | undefined;
  onChange: (guidelines: BrandGuidelines) => void;
}

const defaultGuidelines: BrandGuidelines = {
  colors: [],
  typography: { primaryFont: '' },
  logoUrl: ''
};

const COLOR_ROLES: { value: BrandColor['role']; label: string; description: string }[] = [
  { value: 'primary', label: 'Primary', description: 'Main brand color' },
  { value: 'secondary', label: 'Secondary', description: 'Supporting color' },
  { value: 'accent', label: 'Accent', description: 'Highlights & CTAs' },
  { value: 'optional', label: 'Optional', description: 'Additional color' }
];

const FONT_SUGGESTIONS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
  'Playfair Display', 'Merriweather', 'Source Sans Pro', 'Raleway',
  'Nunito', 'Work Sans', 'DM Sans', 'Outfit', 'Plus Jakarta Sans'
];

export const BrandGuidelinesEditor: React.FC<BrandGuidelinesEditorProps> = ({
  value,
  onChange
}) => {
  const guidelines = value || defaultGuidelines;

  const [newColorHex, setNewColorHex] = useState('#3B82F6');
  const [newColorName, setNewColorName] = useState('');
  const [newColorRole, setNewColorRole] = useState<BrandColor['role']>('primary');

  const addColor = () => {
    if (!newColorHex || guidelines.colors.length >= 5) return;

    const newColor: BrandColor = {
      hex: newColorHex,
      name: newColorName || `Color ${guidelines.colors.length + 1}`,
      role: newColorRole
    };

    onChange({
      ...guidelines,
      colors: [...guidelines.colors, newColor]
    });

    setNewColorHex('#3B82F6');
    setNewColorName('');
    const usedRoles = [...guidelines.colors, newColor].map(c => c.role);
    if (!usedRoles.includes('secondary')) setNewColorRole('secondary');
    else if (!usedRoles.includes('accent')) setNewColorRole('accent');
    else setNewColorRole('optional');
  };

  const removeColor = (index: number) => {
    onChange({
      ...guidelines,
      colors: guidelines.colors.filter((_, i) => i !== index)
    });
  };

  const updateTypography = (field: keyof BrandTypography, val: string) => {
    onChange({
      ...guidelines,
      typography: { ...guidelines.typography, [field]: val }
    });
  };

  const updateLogoUrl = (url: string) => {
    onChange({ ...guidelines, logoUrl: url });
  };

  const getRoleBadgeStyle = (role: BrandColor['role']) => {
    switch (role) {
      case 'primary': return 'bg-blue-100 text-blue-700';
      case 'secondary': return 'bg-purple-100 text-purple-700';
      case 'accent': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Colors Section */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
          <Palette size={16} className="text-gold-500" />
          Brand Colors
          <span className="text-xs font-normal text-gray-400">
            ({guidelines.colors.length}/5)
          </span>
        </h3>

        {guidelines.colors.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-4">
            {guidelines.colors.map((color, idx) => (
              <div key={idx} className="group relative">
                <div
                  className="w-14 h-14 rounded-xl border-2 border-gray-200 shadow-sm"
                  style={{ backgroundColor: color.hex }}
                  title={`${color.name} (${color.role})`}
                />
                <button
                  onClick={() => removeColor(idx)}
                  className="absolute -top-2 -right-2 p-1 bg-white border border-gray-200 rounded-full text-gray-400 hover:text-red-500 hover:border-red-200 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
                <p className="text-xs font-mono text-gray-500 mt-1 text-center truncate w-14">
                  {color.hex}
                </p>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${getRoleBadgeStyle(color.role)} block text-center mt-0.5 truncate`}>
                  {color.role}
                </span>
              </div>
            ))}
          </div>
        )}

        {guidelines.colors.length < 5 && (
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Color</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={newColorHex}
                  onChange={(e) => setNewColorHex(e.target.value)}
                  className="w-10 h-10 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-gold-400 transition-colors"
                />
                <input
                  type="text"
                  value={newColorHex}
                  onChange={(e) => setNewColorHex(e.target.value)}
                  placeholder="#000000"
                  className="w-24 px-2 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 font-mono"
                />
              </div>
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs text-gray-500 mb-1">Name</label>
              <input
                type="text"
                value={newColorName}
                onChange={(e) => setNewColorName(e.target.value)}
                placeholder="e.g. Brand Blue"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Role</label>
              <select
                value={newColorRole}
                onChange={(e) => setNewColorRole(e.target.value as BrandColor['role'])}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold-400 bg-white"
              >
                {COLOR_ROLES.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={addColor}
              disabled={!newColorHex}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <Plus size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Typography Section */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
          <Type size={16} className="text-gold-500" />
          Typography
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Primary Font
            </label>
            <input
              type="text"
              value={guidelines.typography.primaryFont}
              onChange={(e) => updateTypography('primaryFont', e.target.value)}
              placeholder="e.g. Inter"
              list="font-suggestions"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Secondary Font
            </label>
            <input
              type="text"
              value={guidelines.typography.secondaryFont || ''}
              onChange={(e) => updateTypography('secondaryFont', e.target.value)}
              placeholder="e.g. Open Sans"
              list="font-suggestions"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Heading Font
            </label>
            <input
              type="text"
              value={guidelines.typography.headingFont || ''}
              onChange={(e) => updateTypography('headingFont', e.target.value)}
              placeholder="e.g. Playfair Display"
              list="font-suggestions"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400"
            />
          </div>
        </div>
        <datalist id="font-suggestions">
          {FONT_SUGGESTIONS.map(font => (
            <option key={font} value={font} />
          ))}
        </datalist>
      </div>

      {/* Logo Section */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
          <ImageIcon size={16} className="text-gold-500" />
          Logo
        </h3>
        <div className="flex gap-4 items-start">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Logo URL
            </label>
            <input
              type="url"
              value={guidelines.logoUrl || ''}
              onChange={(e) => updateLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400"
            />
          </div>
          {guidelines.logoUrl && (
            <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Preview
              </label>
              <div className="w-16 h-16 bg-gray-100 rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center">
                <img
                  src={guidelines.logoUrl}
                  alt="Logo preview"
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}
        </div>
        {guidelines.logoUrl && (
          <a
            href={guidelines.logoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-gold-600 hover:text-gold-700 mt-2"
          >
            <ExternalLink size={12} />
            Open in new tab
          </a>
        )}
      </div>
    </div>
  );
};

export default BrandGuidelinesEditor;
