<?php

namespace App\Http\Controllers;

use App\Models\File;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class FileController extends Controller
{
    public function create(Request $request)
    {
        $request->validate([
            'file' => 'required|file',
            'text' => 'sometimes|string',
            'type_expected' => 'sometimes|string'
        ]);

        $file = $request->file('file');
        $user = auth('sanctum')->user();
        $mime = $file->getClientMimeType();
        $fileType = null;

        $types = [
            'image'    => ['image/jpeg','image/png','image/gif','image/webp'],
            'video'    => ['video/mp4','video/quicktime','video/x-msvideo','video/x-matroska'],
            'audio'    => ['audio/mpeg','audio/wav','audio/ogg','audio/mp3'],
            'document' => ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain'],
        ];

        foreach ($types as $type => $mimes) {
            if (in_array($mime, $mimes)) {
                $limits = ['image'=>5120, 'video'=>51200, 'audio'=>10240, 'document'=>10240];
                $request->validate(['file' => "max:{$limits[$type]}"]);
                $fileType = $type;
                break;
            }
        }

        if (!$fileType) {
            return response()->json(['success'=>false,'message'=>'File type not allowed'],422);
        }

        if ($request->type_expected && $request->type_expected != $fileType) {
            return response()->json(['success'=>false,'message'=>'File type not allowed']);
        }

        // ✅ Save to storage
        $path = $file->store('uploads', 'public');

        // ✅ NEW: Get file size in bytes
        $fileSize = $file->getSize();

        // ✅ NEW: Compute SHA-256 hash for integrity verification
        $fileHash = hash_file('sha256', $file->getRealPath());

        $fileData = [
            'user_id'   => $user?->id,
            'text'      => $request->text,
            'file_path' => Storage::url($path),
            'file_type' => $fileType,
            'file_size' => $fileSize,
            'hash'      => $fileHash, // ✅ Added hash
        ];

        // ✅ Handle profile picture case
        if ($request?->text) {
            $existFile = File::where('text', 'p>p+')
                ->where('user_id', $user?->id)
                ->first();

            if ($existFile) {
                $existFile->update($fileData);
                $dbFile = $existFile->fresh();
            } else {
                $dbFile = File::create($fileData);
            }
        } else {
            $dbFile = File::create($fileData);
        }

        return response()->json([
            'success' => true,
            'file'    => $dbFile,
        ]);
    }



    public function usersPP(Request $request) {
        $user_ids = $request->input('user_ids');

        if (!is_array($user_ids)) {
            $user_ids = [$user_ids];
            $request->merge(['user_ids' => $user_ids]);
        }

        $request->validate([
            'user_ids'   => 'required|array|min:1',
            'user_ids.*' => 'exists:users,id'
        ]);

        $files = File::whereIn('user_id', $request->user_ids)->where('text', 'p>p+')->get();

        return response()->json([
            'success' => true,
            'pp' => $files
        ]);
    }

    public function getFile(Request $request) {
        $request->validate([
            'file_id' => 'required|integer|exists:files,id'
        ]);

        $file = File::where('id', $request->file_id)->first();

        return response()->json([
            'success' => true,
            'file' => $file
        ]);
    }

    public function delete(Request $request) {
        $request->validate(['id' => 'required|exists:files,id']);
        $file = File::findOrFail($request->id);
        $user = auth('sanctum')->user();

        if ($file->user_id && (!$user || $file->user_id !== $user->id)) {
            return response()->json(['success'=>false,'message'=>'Unauthorized']);
        }

        if (Storage::disk('public')->exists($file->file_path)) {
            Storage::disk('public')->delete($file->file_path);
        }

        $file->update([
            'file_path' => NULL,
            'file_type' => NULL,
        ]);

        return response()->json(['success'=>true,'message'=>'File deleted']);
    }

}
