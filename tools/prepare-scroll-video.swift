// Make a 1080p all-intra H.264 copy for responsive bidirectional browser seeking.
// swift tools/prepare-scroll-video.swift input.mp4 output.mp4
import Foundation
import AVFoundation
import CoreImage
let asset = AVURLAsset(url: URL(fileURLWithPath: CommandLine.arguments[1]))
let destination = URL(fileURLWithPath: CommandLine.arguments[2])
let track = asset.tracks(withMediaType: .video)[0]
let reader = try AVAssetReader(asset: asset)
let output = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32BGRA])
output.alwaysCopiesSampleData = false
reader.add(output)
let writer = try AVAssetWriter(outputURL: destination, fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey:AVVideoCodecType.h264, AVVideoWidthKey:1920, AVVideoHeightKey:1080, AVVideoCompressionPropertiesKey:[AVVideoAverageBitRateKey:20000000, AVVideoMaxKeyFrameIntervalKey:1, AVVideoAllowFrameReorderingKey:false]])
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32BGRA, kCVPixelBufferWidthKey as String:1920, kCVPixelBufferHeightKey as String:1080, kCVPixelBufferIOSurfacePropertiesKey as String:[:]])
writer.add(input)
writer.shouldOptimizeForNetworkUse = true
writer.startWriting(); writer.startSession(atSourceTime: .zero)
reader.startReading()
let context = CIContext(options: [.cacheIntermediates:false])
var count = 0
while let sample = output.copyNextSampleBuffer() {
 guard let source = CMSampleBufferGetImageBuffer(sample), let pool = adaptor.pixelBufferPool else { fatalError("Missing frame/pool") }
 var target: CVPixelBuffer?
 CVPixelBufferPoolCreatePixelBuffer(nil, pool, &target)
 guard let target = target else { fatalError("Buffer allocation failed") }
 let image = CIImage(cvPixelBuffer: source).transformed(by: CGAffineTransform(scaleX:1920.0/Double(CVPixelBufferGetWidth(source)), y:1080.0/Double(CVPixelBufferGetHeight(source))))
 context.render(image, to: target)
 while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.001) }
 guard adaptor.append(target, withPresentationTime:CMSampleBufferGetPresentationTimeStamp(sample)) else { fatalError("Encode failed: \(String(describing:writer.error))") }
 count += 1
}
guard reader.status == .completed else { fatalError("Decode failed: \(String(describing:reader.error))") }
input.markAsFinished()
let done = DispatchSemaphore(value:0)
writer.finishWriting { done.signal() }
done.wait()
guard writer.status == .completed else { fatalError("Write failed: \(String(describing:writer.error))") }
print("Prepared \(count) independently seekable frames at 1920×1080.")
