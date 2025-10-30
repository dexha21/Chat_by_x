<?php

use App\Http\Controllers\ChatController;
use App\Http\Controllers\ContactsController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\FileController;
use App\Http\Controllers\StoriesController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpFoundation\StreamedResponse;


Route::middleware(['auth:sanctum'])->get('/user', function (Request $request) {
    return $request->user();
});

//conversations
Route::middleware(['auth:sanctum'])->post('/create-conversation', [ConversationController::class, 'create']);
Route::middleware(['auth:sanctum'])->post('/download-messages', [ConversationController::class, 'fetch']);
Route::get('/live-chats', [ConversationController::class, 'liveChat']);
Route::get('/live-stories', [ConversationController::class, 'liveStories']);

//chats
Route::middleware(['auth:sanctum'])->post('/send-message', [ChatController::class, 'create']);

//contacts
Route::middleware(['auth:sanctum'])->post('/save-contact', [ContactsController::class, 'create']);
Route::middleware(['auth:sanctum'])->get('/get-contact', [ContactsController::class, 'read']);
Route::middleware(['auth:sanctum'])->post('/edit-contact', [ContactsController::class, 'update']);
Route::middleware(['auth:sanctum'])->post('/delete-contact', [ContactsController::class, 'delete']);

//Files
Route::post('/save-file', [FileController::class, 'create']);
Route::post('/users-pp', [FileController::class, 'usersPP']);
Route::post('/get-file', [FileController::class, 'getFile']);
Route::post('/delete-file', [FileController::class, 'delete']);

//Stories
Route::middleware(['auth:sanctum'])->post('/create-story', [StoriesController::class, 'create']);
Route::middleware(['auth:sanctum'])->get('/get-stories', [StoriesController::class, 'stories']);
Route::middleware(['auth:sanctum'])->post('/delete-story', [StoriesController::class, 'delete']);


Route::post('/test', function (Request $request) {
    return response()->json(['message' => 'POST successful']);
});

Route::get('/status', function () {
    return response()->json(['status' => 'Server is live!']);
});

require __DIR__.'/auth.php';