import React, { useState, useEffect } from 'react';
import { Calendar, Link, AtSign, Phone, Hash, Type, List, ToggleLeft, CircleDollarSign, ExternalLink } from 'lucide-react';
import { CustomField, CustomFieldType } from '../types';

interface CustomFieldsEditorProps {
  entityType: 'contact' | 'client';
  values: { [fieldId: string]: string | number | boolean | null };
  onChange: (values: { [fieldId: string]: string | number | boolean | null }) => void;
  compact?: boolean;
}

// Get icon for field type
const getFieldTypeIcon = (type: CustomFieldType) => {
  switch (type) {
    case 'text': return <Type size={14} />;
    case 'number': return <Hash size={14} />;
    case 'dropdown': return <List size={14} />;
    case 'date': return <Calendar size={14} />;
    case 'checkbox': return <ToggleLeft size={14} />;
    case 'url': return <Link size={14} />;
    case 'email': return <AtSign size={14} />;
    case 'phone': return <Phone size={14} />;
    case 'currency': return <CircleDollarSign size={14} />;
    default: return <Type size={14} />;
  }
};

export const CustomFieldsEditor: React.FC<CustomFieldsEditorProps> = ({
  entityType,
  values,
  onChange,
  compact = false,
}) => {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // Load custom fields from localStorage
  useEffect(() => {
    const loadFields = () => {
      const saved = localStorage.getItem('tawfeeq_custom_fields');
      if (saved) {
        const allFields: CustomField[] = JSON.parse(saved);
        // Filter fields applicable to this entity type
        const applicableFields = allFields.filter(
          f => f.entityType === 'both' || f.entityType === entityType
        ).sort((a, b) => a.order - b.order);
        setCustomFields(applicableFields);
      }
    };

    loadFields();

    // Listen for storage changes
    window.addEventListener('storage', loadFields);
    return () => window.removeEventListener('storage', loadFields);
  }, [entityType]);

  const handleFieldChange = (fieldId: string, value: string | number | boolean | null) => {
    onChange({ ...values, [fieldId]: value });
  };

  if (customFields.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${compact ? '' : 'mt-4 pt-4 border-t border-gray-100 dark:border-dark-border'}`}>
      {!compact && (
        <p className="text-xs font-semibold text-gray-400 dark:text-dark-muted uppercase tracking-wider">Custom Fields</p>
      )}
      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {customFields.map(field => (
          <div key={field.id}>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
              <span className="text-gray-400 dark:text-dark-muted">{getFieldTypeIcon(field.type)}</span>
              {field.name}
              {field.required && <span className="text-red-500">*</span>}
            </label>

            {/* Text field */}
            {field.type === 'text' && (
              <input
                type="text"
                value={(values[field.id] as string) || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                placeholder={field.placeholder || ''}
                className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-800 dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-dark-subtle"
              />
            )}

            {/* Number field */}
            {field.type === 'number' && (
              <input
                type="number"
                value={(values[field.id] as number) || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value ? parseFloat(e.target.value) : null)}
                placeholder={field.placeholder || ''}
                className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-800 dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-dark-subtle"
              />
            )}

            {/* Currency field */}
            {field.type === 'currency' && (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-dark-muted">£</span>
                <input
                  type="number"
                  step="0.01"
                  value={(values[field.id] as number) || ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder={field.placeholder || '0.00'}
                  className="w-full pl-7 pr-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-800 dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-dark-subtle"
                />
              </div>
            )}

            {/* Date field */}
            {field.type === 'date' && (
              <input
                type="date"
                value={(values[field.id] as string) || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-800 dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              />
            )}

            {/* Dropdown field */}
            {field.type === 'dropdown' && (
              <select
                value={(values[field.id] as string) || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-800 dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              >
                <option value="">{field.placeholder || 'Select...'}</option>
                {field.options?.map(opt => (
                  <option key={opt.id} value={opt.label}>{opt.label}</option>
                ))}
              </select>
            )}

            {/* Checkbox field */}
            {field.type === 'checkbox' && (
              <button
                type="button"
                onClick={() => handleFieldChange(field.id, !values[field.id])}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  values[field.id] ? 'bg-gold-500' : 'bg-gray-200 dark:bg-dark-elevated'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    values[field.id] ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            )}

            {/* URL field */}
            {field.type === 'url' && (
              <div className="relative">
                <input
                  type="url"
                  value={(values[field.id] as string) || ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  placeholder={field.placeholder || 'https://...'}
                  className="w-full px-3 pr-9 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-800 dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-dark-subtle"
                />
                {values[field.id] && (
                  <a
                    href={values[field.id] as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-dark-muted hover:text-gold-500 transition-colors"
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>
            )}

            {/* Email field */}
            {field.type === 'email' && (
              <input
                type="email"
                value={(values[field.id] as string) || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                placeholder={field.placeholder || 'email@example.com'}
                className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-800 dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-dark-subtle"
              />
            )}

            {/* Phone field */}
            {field.type === 'phone' && (
              <input
                type="tel"
                value={(values[field.id] as string) || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                placeholder={field.placeholder || '+44...'}
                className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-elevated text-gray-800 dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-dark-subtle"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Component for displaying custom field values (read-only)
interface CustomFieldsDisplayProps {
  entityType: 'contact' | 'client';
  values: { [fieldId: string]: string | number | boolean | null } | undefined;
}

export const CustomFieldsDisplay: React.FC<CustomFieldsDisplayProps> = ({
  entityType,
  values,
}) => {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('tawfeeq_custom_fields');
    if (saved) {
      const allFields: CustomField[] = JSON.parse(saved);
      const applicableFields = allFields.filter(
        f => f.entityType === 'both' || f.entityType === entityType
      ).sort((a, b) => a.order - b.order);
      setCustomFields(applicableFields);
    }
  }, [entityType]);

  if (customFields.length === 0 || !values) {
    return null;
  }

  // Only show fields that have values
  const fieldsWithValues = customFields.filter(f => values[f.id] !== undefined && values[f.id] !== null && values[f.id] !== '');

  if (fieldsWithValues.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-dark-border space-y-2">
      {fieldsWithValues.map(field => (
        <div key={field.id} className="flex items-center gap-2 text-sm">
          <span className="text-gray-400 dark:text-dark-muted">{getFieldTypeIcon(field.type)}</span>
          <span className="text-gray-500 dark:text-dark-muted">{field.name}:</span>
          <span className="text-gray-800 dark:text-dark-text font-medium">
            {field.type === 'checkbox' ? (values[field.id] ? 'Yes' : 'No') :
             field.type === 'currency' ? `£${values[field.id]}` :
             field.type === 'url' ? (
               <a href={values[field.id] as string} target="_blank" rel="noopener noreferrer" className="text-gold-600 dark:text-gold-400 hover:underline inline-flex items-center gap-1">
                 {(values[field.id] as string).replace(/^https?:\/\//, '').slice(0, 30)}
                 <ExternalLink size={12} />
               </a>
             ) :
             String(values[field.id])}
          </span>
        </div>
      ))}
    </div>
  );
};

export default CustomFieldsEditor;
