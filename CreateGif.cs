using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Linq;

class GifCreator
{
    static void Main()
    {
        string imageFolder = @"E:\AI Project\企业管理系统\demo-gif";
        string outputFile = @"E:\AI Project\企业管理系统\demo.gif";
        int duration = 2000; // milliseconds
        
        var imageFiles = Directory.GetFiles(imageFolder, "*.png")
            .OrderBy(f => f)
            .ToArray();
        
        if (imageFiles.Length == 0)
        {
            Console.WriteLine("No PNG files found!");
            return;
        }
        
        Console.WriteLine($"Found {imageFiles.Length} images");
        
        // 使用第一张图片作为基础
        using (var firstImage = new Bitmap(imageFiles[0]))
        {
            // GIF 编码器
            var encoder = GetEncoder(ImageFormat.Gif);
            if (encoder == null)
            {
                Console.WriteLine("GIF encoder not found!");
                return;
            }
            
            var encoderParams = new EncoderParameters(1);
            encoderParams.Param[0] = new EncoderParameter(Encoder.SaveFlag, (long)EncoderValue.MultiFrame);
            
            // 保存第一帧
            firstImage.Save(outputFile, encoder, encoderParams);
            Console.WriteLine($"Created: {outputFile}");
            
            // 添加后续帧
            encoderParams.Param[0] = new EncoderParameter(Encoder.SaveFlag, (long)EncoderValue.FrameDimensionTime);
            
            for (int i = 1; i < imageFiles.Length; i++)
            {
                using (var img = new Bitmap(imageFiles[i]))
                {
                    firstImage.SaveAdd(img, encoderParams);
                    Console.WriteLine($"Added frame {i + 1}/{imageFiles.Length}");
                }
            }
            
            // 结束
            encoderParams.Param[0] = new EncoderParameter(Encoder.SaveFlag, (long)EncoderValue.Flush);
            firstImage.SaveAdd(encoderParams);
        }
        
        Console.WriteLine($"\nGIF saved: {outputFile}");
        Console.WriteLine($"Total frames: {imageFiles.Length}");
        Console.WriteLine($"Duration per frame: {duration}ms");
        Console.WriteLine("\nPress Enter to exit...");
        Console.ReadLine();
    }
    
    static ImageCodecInfo GetEncoder(ImageFormat format)
    {
        var codecs = ImageCodecInfo.GetImageDecoders();
        foreach (var codec in codecs)
        {
            if (codec.FormatID == format.Guid)
                return codec;
        }
        return null;
    }
}
