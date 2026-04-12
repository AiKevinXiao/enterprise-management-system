from PIL import Image
import os

def create_gif():
    output_dir = os.path.dirname(os.path.abspath(__file__))
    gif_path = os.path.join(output_dir, "demo.gif")
    
    image_files = sorted([f for f in os.listdir(output_dir) if f.endswith('.png')])
    
    if not image_files:
        print("No images found!")
        return
    
    print(f"Found {len(image_files)} images")
    
    # 缩小尺寸 + 限制颜色数来压缩
    target_width = 960  # 缩小宽度
    
    images = []
    for filename in image_files:
        filepath = os.path.join(output_dir, filename)
        img = Image.open(filepath)
        if img.mode == 'RGBA':
            img = img.convert('RGB')
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # 等比缩放
        w, h = img.size
        ratio = target_width / w
        new_size = (target_width, int(h * ratio))
        img = img.resize(new_size, Image.LANCZOS)
        
        # 量化为 128 色减少体积
        img = img.quantize(colors=128, method=Image.Quantize.MEDIANCUT)
        img = img.convert('RGB')
        
        images.append(img)
        print(f"Loaded: {filename} -> {new_size[0]}x{new_size[1]}")
    
    if images:
        images[0].save(
            gif_path,
            save_all=True,
            append_images=images[1:],
            duration=2000,
            loop=0,
            optimize=True,
            colors=128
        )
        size_mb = os.path.getsize(gif_path) / (1024 * 1024)
        print(f"\nGIF saved: {gif_path}")
        print(f"Frames: {len(images)}")
        print(f"Size: {size_mb:.2f} MB")

if __name__ == "__main__":
    create_gif()
