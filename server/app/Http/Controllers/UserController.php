<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\File;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function edit(Request $request) {
        $request->validate([
            'name' => 'sometimes|string',
            'file_id' => 'sometimes|integer|exists:files,id'
        ]);

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Sign in first']);
        }

        $user->update($request->only(["name", "file_id"]));

        return response()->json([
            'success' => true,
            'message' => 'Updated'
        ]);
    }

    public function deletePicture(Request $request) {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Sign in first']);
        }

        $file = File::where('id', $user?->file_id)->first();

        if ($file) {
            $file->update([
                "file_path" => NULL,
                "file_type" => NULL
            ]);
        }

        $user->update(['file_id' => null]);

        return response()->json([
            'success' => true,
            'message' => 'Deleted'
        ]);
    }

    public function changePassword(Request $request) {
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed'
        ]);

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Sign in first']);
        }

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Current password is incorrect']);
        }

        $user->update([
            'password' => Hash::make($request->new_password),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Password updated successfully'
        ]);
    }
}
