import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { MessageSquare, Plus, Calendar, User, Tag, Camera, X, Upload, Image as ImageIcon, Trash2, MoreVertical } from 'lucide-react';
import { ImageCropperModal } from './ImageCropperModal';
import type { Post, User as UserType } from '../App';

type BulletinBoardProps = {
  posts: Post[];
  onCreatePost: (post: Omit<Post, 'id' | 'createdAt' | 'authorId'>) => void;
  onDeletePost: (postId: string) => void;
  user: UserType | null;
  onRequireAuth: () => void;
};

const categories = [
  'General Discussion',
  'Tips & Tricks',
  'Equipment Sharing',
  'Local Events',
  'Questions & Help',
  'Success Stories',
  'For Sale/Trade',
  'Weather & Seasonal'
];

export function BulletinBoard({ posts, onCreatePost, onDeletePost, user, onRequireAuth }: BulletinBoardProps) {
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    author: user?.name || '',
    category: 'General Discussion',
    photos: [] as string[]
  });
  
  // Photo upload states
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debug logging
  console.log('BulletinBoard rendered with:', posts.length, 'posts');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const fileSize = file.size;
    const maxSize = 10 * 1024 * 1024; // 10MB limit
    console.log('File selected:', file.name, file.type, 'Size:', Math.round(fileSize / 1024), 'KB');
    
    if (fileSize > maxSize) {
      alert('File size must be less than 10MB. Please choose a smaller image.');
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    
    console.log('Processing file:', file.name, file.type);
    setSelectedFile(file);
    
    // Check if it's a HEIC file and convert it
    if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
      console.log('HEIC file detected, converting...');
      convertHEICToJPEG(file);
    } else {
      // Create preview URL for the cropper
      console.log('Creating preview URL for cropper...');
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
      setShowImageCropper(true);
      console.log('Image cropper should now be visible');
    }
    
    // Reset the file input value so the same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const convertHEICToJPEG = async (heicFile: File) => {
    try {
      // Import heic2any dynamically
      const heic2any = (await import('heic2any')).default;
      
      // Convert HEIC to JPEG
      const convertedBlob = await heic2any({
        blob: heicFile,
        toType: 'image/jpeg',
        quality: 0.9
      }) as Blob;
      
      // Create a new File object from the converted blob
      const convertedFile = new File([convertedBlob], heicFile.name.replace(/\.(heic|heif)$/i, '.jpg'), {
        type: 'image/jpeg'
      });
      
      setSelectedFile(convertedFile);
      
      // Create preview URL for the cropper
      const url = URL.createObjectURL(convertedFile);
      setImagePreviewUrl(url);
      setShowImageCropper(true);
    } catch (error) {
      console.error('Error converting HEIC file:', error);
      alert('Sorry, there was an error processing your HEIC image. Please try selecting a different image or convert it to JPEG first.');
    }
  };

  const handleImageCrop = (croppedImageUrl: string) => {
    console.log('Adding photo to post, current photos:', formData.photos.length);
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, croppedImageUrl]
    }));
    setShowImageCropper(false);
    setSelectedFile(null);
    // Clean up the preview URL
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl('');
    }
    console.log('Photo added successfully');
  };

  const handleCropCancel = () => {
    setShowImageCropper(false);
    setSelectedFile(null);
    // Clean up the preview URL
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl('');
    }
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleDeletePost = (postId: string, postTitle: string) => {
    const post = posts.find(p => p.id === postId);
    const isAdminDelete = user?.isAdmin && post?.authorId !== user.id;
    const confirmMessage = isAdminDelete 
      ? `Are you sure you want to delete "${postTitle}" by ${post?.author}? This action cannot be undone.`
      : `Are you sure you want to delete "${postTitle}"? This action cannot be undone.`;
      
    if (window.confirm(confirmMessage)) {
      onDeletePost(postId);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'General Discussion': 'bg-[#556B2F] text-[#f8f9f6]',
      'Tips & Tricks': 'bg-[#c54a2c] text-[#f8f9f6]',
      'Equipment Sharing': 'bg-[#a8b892] text-[#2d3d1f]',
      'Local Events': 'bg-[#8b7355] text-[#f8f9f6]',
      'Questions & Help': 'bg-[#6b8ba3] text-[#f8f9f6]',
      'Success Stories': 'bg-[#689c3a] text-[#f8f9f6]',
      'For Sale/Trade': 'bg-[#b8674a] text-[#f8f9f6]',
      'Weather & Seasonal': 'bg-[#7a6b8a] text-[#f8f9f6]'
    };
    return colors[category] || 'bg-[#556B2F] text-[#f8f9f6]';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    
    console.log('Submitting post with data:', formData);
    onCreatePost(formData);
    setFormData({
      title: '',
      content: '',
      author: user.name,
      category: 'General Discussion',
      photos: []
    });
    setShowForm(false);
  };

  const filteredPosts = selectedCategory === 'all' 
    ? posts 
    : posts.filter(post => post.category === selectedCategory);

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-[#2d3d1f] mb-2">Community Bulletin Board</h1>
          <p className="text-[#3c4f21]">Share knowledge, ask questions, and connect with fellow homesteaders</p>
        </div>
        
        <Button 
          onClick={() => user ? setShowForm(true) : onRequireAuth()}
          className="bg-[#c54a2c] hover:bg-[#b8432a] text-[#f8f9f6]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Post
        </Button>
      </div>

      {/* Category Filter */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
            className={selectedCategory === 'all' 
              ? 'bg-[#556B2F] text-[#f8f9f6] hover:bg-[#556B2F]'
              : 'border-[#556B2F] text-[#556B2F] hover:bg-[#556B2F] hover:text-[#f8f9f6]'
            }
          >
            All Posts
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className={selectedCategory === category 
                ? 'bg-[#556B2F] text-[#f8f9f6] hover:bg-[#556B2F]'
                : 'border-[#556B2F] text-[#556B2F] hover:bg-[#556B2F] hover:text-[#f8f9f6]'
              }
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Create Post Form Modal */}
      {showForm && user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="bg-[#ffffff] border-[#a8b892] max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <CardHeader className="bg-[#556B2F] text-[#f8f9f6]">
              <div className="flex justify-between items-center">
                <CardTitle>Create New Post</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowForm(false)}
                  className="text-[#f8f9f6] hover:bg-[#6B7F3F]"
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="author" className="text-[#2d3d1f]">Your Name</Label>
                  <Input
                    id="author"
                    type="text"
                    value={user.name}
                    disabled
                    className="mt-1 bg-gray-100 border-[#a8b892]"
                  />
                </div>

                <div>
                  <Label htmlFor="category" className="text-[#2d3d1f]">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger className="mt-1 bg-[#ffffff] border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#ffffff] border-[#a8b892]">
                      {categories.map((category) => (
                        <SelectItem key={category} value={category} className="focus:bg-[#f8f9f6]">
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="title" className="text-[#2d3d1f]">Title</Label>
                  <Input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                    className="mt-1 bg-[#ffffff] border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F]"
                    placeholder="What's your post about?"
                  />
                </div>

                <div>
                  <Label htmlFor="content" className="text-[#2d3d1f]">Content</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    required
                    className="mt-1 bg-[#ffffff] border-[#a8b892] focus:border-[#556B2F] focus:ring-[#556B2F] resize-none"
                    rows={6}
                    placeholder="Share your thoughts, questions, or information..."
                  />
                </div>

                {/* Photos Section */}
                <div>
                  <Label className="text-[#2d3d1f]">Photos (Optional - Up to 5)</Label>
                  <div className="mt-2 space-y-3">
                    {/* Photo Upload Button */}
                    {formData.photos.length < 5 && (
                      <div className="border-2 border-dashed border-[#a8b892] rounded-lg p-4 text-center">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="border-[#556B2F] text-[#556B2F] hover:bg-[#556B2F] hover:text-white"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Add Photo
                        </Button>
                        <p className="text-xs text-[#556B2F] mt-2">
                          JPG, PNG, HEIC up to 10MB
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,.heic,.heif"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </div>
                    )}

                    {/* Photo Preview Grid */}
                    {formData.photos.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {formData.photos.map((photo, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={photo}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border border-[#a8b892]"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removePhoto(index)}
                              className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="submit" 
                    className="flex-1 bg-[#c54a2c] hover:bg-[#b8432a] text-[#f8f9f6]"
                  >
                    Create Post
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowForm(false)}
                    className="border-[#556B2F] text-[#556B2F] hover:bg-[#556B2F] hover:text-[#f8f9f6]"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Image Cropper Modal */}
      {showImageCropper && selectedFile && (
        <ImageCropperModal
          imageFile={selectedFile}
          onCrop={handleImageCrop}
          onCancel={handleCropCancel}
          aspectRatio={16/9}
          title="Crop your photo"
        />
      )}

      {/* Posts */}
      {filteredPosts.length === 0 ? (
        <Card className="bg-[#ffffff] border-[#a8b892] p-12 text-center">
          <MessageSquare className="h-12 w-12 text-[#a8b892] mx-auto mb-4" />
          <h3 className="text-[#2d3d1f] mb-2">
            {selectedCategory === 'all' ? 'No posts yet' : `No posts in ${selectedCategory}`}
          </h3>
          <p className="text-[#3c4f21] mb-4">
            Be the first to share something with the community!
          </p>
          <Button 
            onClick={() => user ? setShowForm(true) : onRequireAuth()}
            className="bg-[#c54a2c] hover:bg-[#b8432a] text-[#f8f9f6]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create First Post
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredPosts.map((post) => (
            <Card key={post.id} className="bg-[#ffffff] border-[#a8b892] shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={getCategoryColor(post.category)}>
                        <Tag className="w-3 h-3 mr-1" />
                        {post.category}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg text-[#2d3d1f]">{post.title}</CardTitle>
                  </div>
                  
                  {/* Delete Button - Show for post author or admin */}
                  {user && (user.isAdmin || post.authorId === user.id) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePost(post.id, post.title)}
                      className="text-[#c54a2c] hover:text-[#b8432a] hover:bg-[#fef2f2] transition-colors"
                      title={user.isAdmin ? "Delete post (Admin privileges)" : "Delete post"}
                    >
                      <Trash2 className="w-4 h-4" />
                      {user.isAdmin && post.authorId !== user.id && (
                        <Badge className="ml-1 bg-orange-500 text-white text-xs px-1 py-0">
                          ADMIN
                        </Badge>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-[#3c4f21] whitespace-pre-wrap">{post.content}</p>
                
                {/* Post Photos */}
                {post.photos && post.photos.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-[#556B2F]">
                      <ImageIcon className="w-4 h-4" />
                      <span>{post.photos.length} photo{post.photos.length > 1 ? 's' : ''}</span>
                    </div>
                    <div className={`grid gap-3 ${
                      post.photos.length === 1 ? 'grid-cols-1 max-w-md' :
                      post.photos.length === 2 ? 'grid-cols-2' :
                      post.photos.length === 3 ? 'grid-cols-3' :
                      'grid-cols-2 md:grid-cols-3'
                    }`}>
                      {post.photos.map((photo, index) => (
                        <div 
                          key={index} 
                          className={`aspect-square rounded-lg overflow-hidden bg-[#f8f9f6] border-2 border-[#a8b892] cursor-pointer hover:border-[#556B2F] transition-colors ${
                            post.photos.length === 1 ? 'aspect-video' : 'aspect-square'
                          }`}
                          onClick={() => window.open(photo, '_blank')}
                        >
                          <img
                            src={photo}
                            alt={`${post.title} - Photo ${index + 1}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-3 border-t border-[#a8b892] text-sm text-[#3c4f21]">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-[#556B2F]" />
                    <span>{post.author}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#556B2F]" />
                    <span>{formatDate(post.createdAt)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}