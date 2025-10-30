<?php

namespace App\Http\Controllers;

// use App\Http\Controllers\FileController;
use App\Models\Contacts;
use App\Models\Stories;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StoriesController extends Controller
{
    public function create(Request $request) {
        $request->validate([
            'file_id' => 'sometimes|exists:files,id',
            'text' => 'sometimes|string',
            'duration' => 'sometimes|integer'
        ]);

        $file_id = $request?->file_id ?? NULL;
        $text = $request?->text ?? NULL;
        $user = $request?->user();

        $exp = in_array($request->duration, [2, 3]) ? $request->duration : 1;

        $expires_at = now()->addDays($exp);

        if (!$user) {
            return response()->json([
                'message' => 'Must be logged in!'
            ]);
        }

        if(!$file_id && !$text) {
            return response()->json([
                'message' => 'Upload something!'
            ]);
        }

        $story = Stories::create([
            'user_id' => $user->id,
            'text' => $text,
            'file_id' => $file_id,
            'expires_at' => $expires_at
        ]);

        $story->load('file', 'user');

        return response()->json([
            'success' => true,
            'message' => 'uploaded',
            'story' => $story
        ]);

    }

    public function stories(Request $request) {
        $user = $request?->user();

        if (!$user) {
            return response()->json([
                'Not logged in!'
            ]);
        }

        $contacts = Contacts::where('creator_id', $user->id)->where('recipient_id', '!=', $user->id)->where('is_mutual', 1)->distinct('recipient_id')->get();

        $recipient_ids = [];

        foreach ($contacts as $contact) {
            $recipient_ids[] = $contact->recipient_id;
        }

        $recipient_ids[] = $user->id;

        $stories = Stories::with('user', 'file')->whereIn('user_id', $recipient_ids)->where('expires_at', '>', DB::raw('NOW()'))->get();

        return response()->json([
            'success' => true,
            'stories' => $stories
        ]);
        
    }
    
    public function delete(Request $request) {
        $request->validate([
            'id' => 'required|exists:stories,id'
        ]);

        $user = $request?->user();

        if (!$user) {
            return response()->json([
                'message' => 'Must be logged in!'
            ]);
        }

        $story = Stories::where('id', $request->id)->where('user_id', $user->id);

        // if ($story->file_id) {
        //     $fileController = new FileController();

        //     $newRequest = Request::create('/api/delete-file', 'POST', [
        //         'id' => $story->file_id,
        //     ]);

        //     $newRequest->setUserResolver(function () {
        //         return auth()->user();
        //     });

        //     $res = $fileController->delete($newRequest);
        // }

        $story->update([
            'file_id' => null,
            'text' => null
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Story deleted'
        ]);
    }
}
