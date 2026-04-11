from PIL import Image
import os
import sys

def create_gif(image_folder, output_file, duration=2000):
    """将文件夹中的图片合成为 GIF"""
    
    # 获取所有 png 文件并排序
    image_files = sorted([f for f in os.listdir(image_folder) if f.endswith('.png')])
    
    if not image_files:
        print("No PNG files found!")
        return
    
    print(f"Found {len(image_files)} images")
    
    # 打开所有图片
    images = []
    for filename in image_files:
        filepath = os.path.join(image_folder, filename)
        img = Image.open(filepath)
        
        # 转换为 RGB 模式（GIF 不支持 RGBA）
        if img.mode == 'RGBA':
            # 创建白色背景
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])  # 使用 alpha 通道作为 mask
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        images.append(img)
        print(f"Loaded: {filename}")
    
    # 保存为 GIF
    if images:
        # 计算帧间隔（毫秒转百分之一秒）
        duration_cs = duration // 10
        
        images[0].save(
            output_file,
            save_all=True,
            append_images=images[1:],
            duration=duration_cs,
            loop=0,
            optimize=True
        )
        print(f"\nGIF saved to: {output_file}")
        print(f"Total frames: {len(images)}")
        print(f"Duration per frame: {duration}ms")

if __name__ == "__main__":
    # 项目目录
    base_dir = r"E:\AI Project\企业管理系统"
    image_folder = os.path.join(base_dir, "demo-gif")
    output_file = os.path.join(base_dir, "demo.gif")
    
    create_gif(image_folder, output_file, duration=2000)
    
    print("\nPress Enter to exit...")
    input()
