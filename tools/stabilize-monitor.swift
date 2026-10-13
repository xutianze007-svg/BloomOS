// Repair the generated lower-left CRT bezel using a registered local repair plate.
// Usage: swift tools/stabilize-monitor.swift input.mp4 output.mp4 repair-plate.png
import Foundation
import AVFoundation
import CoreVideo
import AppKit
let source=URL(fileURLWithPath:CommandLine.arguments[1])
let destination=URL(fileURLWithPath:CommandLine.arguments[2])
let asset=AVURLAsset(url:source)
let track=asset.tracks(withMediaType:.video)[0]
let reader=try AVAssetReader(asset:asset)
let output=AVAssetReaderTrackOutput(track:track,outputSettings:[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32BGRA])
output.alwaysCopiesSampleData=true
reader.add(output)
let writer=try AVAssetWriter(outputURL:destination,fileType:.mp4)
let input=AVAssetWriterInput(mediaType:.video,outputSettings:[AVVideoCodecKey:AVVideoCodecType.h264,AVVideoWidthKey:1920,AVVideoHeightKey:1080,AVVideoCompressionPropertiesKey:[AVVideoAverageBitRateKey:12000000,AVVideoProfileLevelKey:AVVideoProfileLevelH264HighAutoLevel]])
input.expectsMediaDataInRealTime=false
let adaptor=AVAssetWriterInputPixelBufferAdaptor(assetWriterInput:input,sourcePixelBufferAttributes:[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32BGRA,kCVPixelBufferWidthKey as String:1920,kCVPixelBufferHeightKey as String:1080])
writer.add(input)
writer.shouldOptimizeForNetworkUse=true
writer.startWriting();writer.startSession(atSourceTime:.zero);reader.startReading()
func smooth(_ a:Double,_ b:Double,_ x:Double)->Double{let t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)}
let plate=NSBitmapImageRep(data:try Data(contentsOf:URL(fileURLWithPath:CommandLine.arguments[3])))!
let platePixels=plate.bitmapData!,plateStride=plate.bytesPerRow,plateChannels=plate.bitsPerPixel/8
precondition(plate.pixelsWide==256 && plate.pixelsHigh==256 && (plate.samplesPerPixel==3 || plate.samplesPerPixel==4))
var count=0
while let sample=output.copyNextSampleBuffer(){
 let buffer=CMSampleBufferGetImageBuffer(sample)!
 guard CVPixelBufferGetWidth(buffer)==1920 && CVPixelBufferGetHeight(buffer)==1080 else {fatalError("Input must be 1920x1080")}
 let time=CMSampleBufferGetPresentationTimeStamp(sample)
 CVPixelBufferLockBaseAddress(buffer,[])
 let stride=CVPixelBufferGetBytesPerRow(buffer),p=CVPixelBufferGetBaseAddress(buffer)!.assumingMemoryBound(to:UInt8.self)
 let temporal=smooth(0.65,1.25,time.seconds)
 if temporal>0 {
  let background=700*stride+1140*4
  let plateBackground=100*plateStride+140*plateChannels
  for y in 700..<810 {for x in 1044..<1162 {
   let i=y*stride+x*4,pi=(y-600)*plateStride+(x-1000)*plateChannels
   let pr=Double(platePixels[pi])/255,pg=Double(platePixels[pi+1])/255,pb=Double(platePixels[pi+2])/255
   let mx=max(pr,max(pg,pb)),mn=min(pr,min(pg,pb))
   let ui=smooth(1068,1084,Double(x))*(1-smooth(790,802,Double(y)))*smooth(0.50,0.85,mx)*(1-smooth(0.20,0.65,(mx-mn)/max(0.01,mx)))
   let feather=smooth(1044,1058,Double(x))*(1-smooth(1148,1162,Double(x)))*smooth(700,714,Double(y))*(1-smooth(798,810,Double(y)))
   let alpha=temporal*feather
   for k in 0..<3 {
    var repaired=Double(platePixels[pi+2-k])
    repaired+=(Double(p[background+k])-Double(platePixels[plateBackground+2-k]))*ui
    repaired=max(0,min(255,repaired))
    p[i+k]=UInt8(max(0,min(255,Double(p[i+k])*(1-alpha)+repaired*alpha)).rounded())
   }
  }}
 }
 CVPixelBufferUnlockBaseAddress(buffer,[])
 while !input.isReadyForMoreMediaData{Thread.sleep(forTimeInterval:0.002)}
 if !adaptor.append(buffer,withPresentationTime:time){fatalError("Write failed: \(String(describing:writer.error))")}
 count+=1
}
if reader.status == .failed {fatalError("Read failed: \(String(describing:reader.error))")}
input.markAsFinished();writer.endSession(atSourceTime:asset.duration)
let done=DispatchSemaphore(value:0);writer.finishWriting{done.signal()};done.wait()
if writer.status != .completed{fatalError("Export failed: \(String(describing:writer.error))")}
print("Repaired \(count) frames; duration \(asset.duration.seconds)s")
