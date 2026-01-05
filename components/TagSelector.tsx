import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Tag as TagIcon, Check } from 'lucide-react';
import { Tag } from '../types';

interface TagSelectorProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  size?: 'sm' | 'md';
}

// Predefined tag colors
const TAG_COLORS = [
  { name: 'Gray', value: 'bg-gray-100 text-gray-700 border-gray-200' },
  { name: 'Red', value: 'bg-red-100 text-red-700 border-red-200' },
  { name: 'Orange', value: 'bg-orange-100 text-orange-700 border-orange-200' },
  { name: 'Yellow', value: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { name: 'Green', value: 'bg-green-100 text-green-700 border-green-200' },
  { name: 'Teal', value: 'bg-teal-100 text-teal-700 border-teal-200' },
  { name: 'Blue', value: 'bg-blue-100 text-blue-700 border-blue-200' },
  { name: 'Indigo', value: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { name: 'Purple', value: 'bg-purple-100 text-purple-700 border-purple-200' },
  { name: 'Pink', value: 'bg-pink-100 text-pink-700 border-pink-200' },
];

const TagSelector: React.FC<TagSelectorProps> = ({ selectedTagIds, onChange, size = 'md' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showNewTagForm, setShowNewTagForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[4].value); // Default green
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load tags from localStorage
  const [tags, setTags] = useState<Tag[]>(() => {
    try {
      const saved = localStorage.getItem('tawfeeq_tags');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save tags to localStorage
  useEffect(() => {
    localStorage.setItem('tawfeeq_tags', JSON.stringify(tags));
  }, [tags]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowNewTagForm(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedTags = tags.filter(t => selectedTagIds.includes(t.id));

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const handleCreateTag = () => {
    if (!newTagName.trim()) return;
    const newTag: Tag = {
      id: Date.now().toString(),
      name: newTagName.trim(),
      color: newTagColor,
    };
    setTags([...tags, newTag]);
    onChange([...selectedTagIds, newTag.id]);
    setNewTagName('');
    setShowNewTagForm(false);
  };

  const handleDeleteTag = (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTags(tags.filter(t => t.id !== tagId));
    onChange(selectedTagIds.filter(id => id !== tagId));
  };

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-0.5'
    : 'text-xs px-2.5 py-1';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected tags display */}
      <div
        className="flex flex-wrap gap-1.5 min-h-[32px] p-1.5 border border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedTags.length > 0 ? (
          selectedTags.map(tag => (
            <span
              key={tag.id}
              className={`inline-flex items-center gap-1 ${sizeClasses} rounded-full font-medium border ${tag.color}`}
            >
              {tag.name}
              <button
                onClick={(e) => { e.stopPropagation(); toggleTag(tag.id); }}
                className="hover:opacity-70"
              >
                <X size={12} />
              </button>
            </span>
          ))
        ) : (
          <span className="text-gray-400 text-sm px-1">Add tags...</span>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden">
          {!showNewTagForm ? (
            <>
              {/* Tag list */}
              <div className="max-h-48 overflow-y-auto p-1">
                {tags.length === 0 ? (
                  <div className="px-3 py-4 text-center text-gray-400 text-sm">
                    <TagIcon size={20} className="mx-auto mb-2 opacity-50" />
                    No tags yet
                  </div>
                ) : (
                  tags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 rounded-lg transition-colors group"
                    >
                      <span className={`inline-flex items-center gap-2 ${sizeClasses} rounded-full font-medium border ${tag.color}`}>
                        {tag.name}
                      </span>
                      <div className="flex items-center gap-2">
                        {selectedTagIds.includes(tag.id) && (
                          <Check size={14} className="text-green-500" />
                        )}
                        <button
                          onClick={(e) => handleDeleteTag(tag.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Create new tag button */}
              <div className="border-t border-gray-100 p-2">
                <button
                  onClick={() => setShowNewTagForm(true)}
                  className="w-full px-3 py-2 text-sm text-gold-600 hover:bg-gold-50 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus size={14} />
                  Create new tag
                </button>
              </div>
            </>
          ) : (
            /* New tag form */
            <div className="p-3 space-y-3">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Tag name..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
              />

              {/* Color picker */}
              <div className="flex flex-wrap gap-1.5">
                {TAG_COLORS.map(color => (
                  <button
                    key={color.name}
                    onClick={() => setNewTagColor(color.value)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${color.value.split(' ')[0]} ${
                      newTagColor === color.value ? 'ring-2 ring-offset-1 ring-gray-400' : ''
                    }`}
                    title={color.name}
                  />
                ))}
              </div>

              {/* Preview */}
              {newTagName && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Preview:</span>
                  <span className={`inline-flex items-center ${sizeClasses} rounded-full font-medium border ${newTagColor}`}>
                    {newTagName}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowNewTagForm(false)}
                  className="flex-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim()}
                  className="flex-1 px-3 py-2 text-sm text-white bg-gold-500 hover:bg-gold-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Utility component to display tags inline (read-only)
export const TagBadges: React.FC<{ tagIds: string[]; size?: 'sm' | 'md' }> = ({ tagIds, size = 'sm' }) => {
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tawfeeq_tags');
      if (saved) {
        setTags(JSON.parse(saved));
      }
    } catch {
      setTags([]);
    }
  }, []);

  const selectedTags = tags.filter(t => tagIds.includes(t.id));

  if (selectedTags.length === 0) return null;

  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-1.5 py-0.5'
    : 'text-xs px-2 py-0.5';

  return (
    <div className="flex flex-wrap gap-1">
      {selectedTags.map(tag => (
        <span
          key={tag.id}
          className={`inline-flex items-center ${sizeClasses} rounded-full font-medium border ${tag.color}`}
        >
          {tag.name}
        </span>
      ))}
    </div>
  );
};

export default TagSelector;
