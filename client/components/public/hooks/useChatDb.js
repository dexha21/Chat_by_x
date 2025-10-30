import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import * as Crypto from "expo-crypto";
import { openDB } from 'idb';
import uuid from 'react-native-uuid';
import dbEvents from './dbEvents';
import axious from '../utils/axious';
import { NotificationManager } from '../NotificationManager';

const ensureColumn = async (db, table, column, definition) => {
  const columns = await db.getAllAsync(`PRAGMA table_info(${table});`);
  const exists = columns.some(col => col.name === column);

  if (!exists) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
    console.log(`✅ Added missing column '${column}' to '${table}'`);
  }
};

export const useChatDb = () => {
  const sqliteDbRef = useRef(null);
  const idbRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (Platform.OS === 'web') {
      (async () => {
        idbRef.current = await openDB('chat_by_x-db', 4, {
          upgrade(db) {
            if (!db.objectStoreNames.contains('chats')) {
              const chatsStore = db.createObjectStore('chats', { keyPath: 'id' });
              chatsStore.createIndex('conversation_id', 'conversation_id');
            }
            if (!db.objectStoreNames.contains('contacts')) {
              db.createObjectStore('contacts', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('conversations')) {
              db.createObjectStore('conversations', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('conversations_participants')) {
              db.createObjectStore('conversations_participants', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('files')) {
              db.createObjectStore('files', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('users_stored')) {
              db.createObjectStore('users_stored', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('stories')) {
              db.createObjectStore('stories', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('viewed_stories')) {
              db.createObjectStore('viewed_stories', { keyPath: 'id' });
            }
          },
        });
        setIsReady(true);
      })();
    } else {
      (async () => {
        sqliteDbRef.current = await SQLite.openDatabaseAsync('chat_by_x.db');

        await sqliteDbRef.current.execAsync(`
          PRAGMA journal_mode = WAL;
          CREATE TABLE IF NOT EXISTS contacts (
            id TEXT PRIMARY KEY NOT NULL,
            creator_id TEXT,
            recipient_id TEXT,
            name TEXT,
            email TEXT,
            is_mutual INTEGER,
            synced INTEGER DEFAULT 0,
            deleted INTEGER DEFAULT 0
          );
          CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY NOT NULL,
            type TEXT,
            name TEXT,
            synced INTEGER DEFAULT 0,
            deleted INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE IF NOT EXISTS chats (
            id TEXT PRIMARY KEY NOT NULL,
            conversation_id TEXT,
            sender_id TEXT,
            message TEXT,
            message_type TEXT,
            synced INTEGER DEFAULT 0,
            deleted INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(conversation_id) REFERENCES conversations(id)
          );
          CREATE TABLE IF NOT EXISTS conversations_participants (
            id TEXT PRIMARY KEY NOT NULL,
            conversation_id TEXT,
            user_id TEXT,
            synced INTEGER DEFAULT 0,
            deleted INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(conversation_id) REFERENCES conversations(id)
          );
          CREATE TABLE IF NOT EXISTS files (
            id TEXT PRIMARY KEY NOT NULL,
            user_id TEXT,
            text TEXT,
            file_path TEXT,
            local_storage TEXT,
            file_type TEXT,
            updated_at TEXT,
            synced INTEGER DEFAULT 0,
            deleted INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE IF NOT EXISTS users_stored (
            id TEXT PRIMARY KEY NOT NULL,
            email TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE IF NOT EXISTS stories (
            id TEXT PRIMARY KEY NOT NULL,
            email TEXT,
            file_id INTEGER,
            name TEXT,
            user_id INTEGER,
            expires_at TEXT,
            updated_at TEXT,
            synced INTEGER DEFAULT 0,
            deleted INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE IF NOT EXISTS viewed_stories (
            id TEXT PRIMARY KEY NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );          
        `);

        await ensureColumn(sqliteDbRef.current, "conversations_participants", "email", "TEXT");
        await ensureColumn(sqliteDbRef.current, "conversations", "updated_at", "TEXT");
        await ensureColumn(sqliteDbRef.current, "chats", "updated_at", "TEXT");
        await ensureColumn(sqliteDbRef.current, "conversations_participants", "updated_at", "TEXT");
        await ensureColumn(sqliteDbRef.current, "stories", "text", "TEXT");
        await ensureColumn(sqliteDbRef.current, "viewed_stories", "viewed", "INTEGER DEFAULT 1");
        await ensureColumn(sqliteDbRef.current, "viewed_stories", "synced", "INTEGER DEFAULT 0");
        await ensureColumn(sqliteDbRef.current, "files", "hash", "TEXT");

        setIsReady(true);
      })();
    }
  }, []);

  const FILE_URL = "http://192.168.0.100/Chat_by_x/server/public"

  const updateOrInsert = async (table, data, whereKey = 'id') => {
    if (Platform.OS === 'web') {
      await idbRef.current.put(table, data);
    } else {
      const existing = await sqliteDbRef.current.getFirstAsync(
        `SELECT ${whereKey} FROM ${table} WHERE ${whereKey} = ?`,
        [data[whereKey]]
      );

      if (existing) {
        const columns = Object.keys(data).filter(k => k !== whereKey);
        const values = columns.map(k => data[k]);
        const setClause = columns.map(c => `${c} = ?`).join(', ');
        await sqliteDbRef.current.runAsync(
          `UPDATE ${table} SET ${setClause} WHERE ${whereKey} = ?`,
          ...values,
          data[whereKey]
        );
      } else {
        const columns = Object.keys(data);
        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.map(k => data[k]);
        try {
          await sqliteDbRef.current.runAsync(
            `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
            ...values
          );
        } catch (e) {
          console.error(`[SQLite] Failed to insert into ${table}:`, e.message, data);
        }
      }
    }
  };


  // ----------------------
  // CRUD: CONTACTS
  // ----------------------
  const createContact = async (token, email, name, callback) => {
    //send to server, then save to client db

    try {
      await axious('/api/save-contact', async(res) => {
        if (res.success) {
          const contact = res.contact

          if (!contact) {
            NotificationManager.push({ message: 'an error occured saving contact', type: 'error' })

            return
          }

          const cont = {
            id: contact.id,
            creator_id: contact.creator_id,
            recipient_id: contact.recipient_id,
            email: contact.email,
            name: contact.name,
            synced: 1,
            deleted: 0,
            created_at: new Date().toISOString(),
          };

          if (Platform.OS === 'web') {
            await idbRef.current.put('contacts', cont);
          } else {
            await sqliteDbRef.current.runAsync(
              'INSERT INTO contacts (id, creator_id, recipient_id, email, name, synced, deleted) VALUES (?, ?, ?, ?, ?, 1, 0)',
              cont.id, cont.creator_id, cont.recipient_id, cont.email, cont.name
            );
          }

          if (contact?.recipient_id) {
              console.log("inserting into users_stored 1");
            await updateOrInsert("users_stored", {
              id: contact?.recipient_id,
              email: contact?.email
            });
          }

          dbEvents.emit('contacts-changed');
          callback?.(cont);
        } else {
          NotificationManager.push({
            message: res.message, 
            type: "error"
          })
        }
        // console.log(res);
        
      }, {
        method: 'POST',
        token,
        data: {
          email,
          name,
        }, 
        headers: {
          'Accept' : 'application/json' 
        }
      })
    } catch (e) {
      NotificationManager.push({ message: `failed. ${e.message}`, type: "error" })
    } finally {
      setLoading(false)
    }

  };

  //read
  const getAllContacts = async (callback) => {
    if (Platform.OS === 'web') {
      const tx = idbRef.current.transaction('contacts', 'readonly');
      const store = tx.objectStore('contacts');
      const all = await store.getAll();
      const sort = all.sort((a, b) => a.name > b.name)
      callback(sort);
    } else {
      const rows = await sqliteDbRef.current.getAllAsync(
        `SELECT * FROM contacts ORDER BY name ASC`,
        []
      );
      console.log(rows);
      
      callback(rows);
    }
  };

  const getContact = async (recipient_id, callback) => {
    if (Platform.OS === "web") {
      const tx = idbRef.current.transaction("contacts", "readonly");
      const store = tx.objectStore("contacts");
      const all = await store.getAll();

      

      // Sort alphabetically by name
      const sorted = all.sort((a, b) => a.name.localeCompare(b.name));

      // Find recipient
      const recipient = sorted.find((r) => r.recipient_id == recipient_id);

      callback(recipient ?? null); // always return a single object or null
    } else {
      const rows = await sqliteDbRef.current.getAllAsync(
        `SELECT * FROM contacts WHERE recipient_id = ? ORDER BY name ASC LIMIT 1`,
        [recipient_id]
      );

      callback(rows[0] ?? null); // always return one contact or null
    }
  };


  const refreshContacts = async (token) => {
    if (!token) return;
    setLoading(true);

    try {
      await axious('/api/get-contact', async (res) => {
        console.log("Server contacts:", res);

        if (res.success) {
          const serverContacts = res.contact || [];

          // 1. Get all client contacts
          let clientContacts = [];
          if (Platform.OS === "web") {
            const tx = idbRef.current.transaction("contacts", "readonly");
            const store = tx.objectStore("contacts");
            clientContacts = await store.getAll();
          } else {
            const result = await sqliteDbRef.current.getAllAsync(
              "SELECT * FROM contacts"
            );
            clientContacts = result || [];
          }

          // 2. Build quick lookup of server contacts by ID
          const serverIds = new Set(serverContacts.map(c => c.id));

          // 3. Delete contacts that are in client but not in server
          for (const c of clientContacts) {
            if (!serverIds.has(c.id)) {
              if (Platform.OS === "web") {
                const tx = idbRef.current.transaction("contacts", "readwrite");
                const store = tx.objectStore("contacts");
                await store.delete(c.id);
              } else {
                await sqliteDbRef.current.runAsync(
                  "DELETE FROM contacts WHERE id = ?",
                  [c.id]
                );
              }
            }
          }

          // 4. Insert or update contacts from server
          for (const contact of serverContacts) {
            await updateOrInsert("contacts", {
              id: contact.id,
              creator_id: contact.creator_id,
              recipient_id: contact.recipient_id,
              email: contact.email,
              name: contact.name,
              synced: 1,
              deleted: 0,
            });

            if (contact?.recipient_id) {
              console.log("inserting into users_stored 2");
              await updateOrInsert("users_stored", {
                id: contact?.recipient_id,
                email: contact?.email
              });
            }
          }



          dbEvents.emit("contacts-changed");
        } else {
          NotificationManager.push({ message: res.message, type: "error" });
        }
      }, {
        method: "GET",
        token,
      });
    } catch (e) {
      NotificationManager.push({
        message: `failed. ${e.message}`,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };



  //update
  const editContact = async (token, name, email, id) => {
    if (!token || !name || !email || !id) return;

    setLoading(true)

    try {
      await axious('/api/edit-contact', async(res) => {
        if (res.success) {
          const contact = res.contact
          if (Platform.OS === 'web') {
            const tx = idbRef.current.transaction('contacts', 'readwrite');
            const store = tx.objectStore('contacts');
            const msg = await store.get(id);
            if (msg) {
              msg.name = name;
              msg.email = email;
              msg.recipient_id = contact.recipient_id,
              await store.put(msg);
            }
          } else {
            await sqliteDbRef.current.runAsync(
              'UPDATE contacts SET name = ?, email = ?, recipient_id = ? WHERE id = ?',
              [name, email, contact.recipient_id, id]
            );
          }

          dbEvents.emit('contacts-changed');
          NotificationManager.push({ message: 'Contact updated', type: 'success' });
        } else {
          NotificationManager.push({
            message: res.message, 
            type: "error"
          })
        }
        // console.log(res);
        
      }, {
        method: 'POST',
        token,
        data: {
          id,
          name,
          email
        }, 
        headers: {
          'Accept' : 'application/json' 
        }
      })
    } catch (e) {
      NotificationManager.push({ message: `failed. ${e.message}`, type: "error" })
    } finally {
      setLoading(false)
    }

  }

  //delete
  const clearClientContact = async () => {
    if (Platform.OS === 'web') {
      // IndexedDB: clear the entire store
      await idbRef.current.clear('contacts');
    } else {
      // SQLite: delete all rows from the table
      await sqliteDbRef.current.runAsync('DELETE FROM contacts');
    }

    // Emit event so UI updates
    dbEvents.emit('contacts-changed');
  };

  const deleteContact = async (id, token) => {
    if (!token) return;

    setLoading(true);

    try {
      await axious('/api/delete-contact', async(res) => {
        if (res.success) {
          if (Platform.OS === 'web') {
          // Delete directly from IndexedDB
          const tx = idbRef.current.transaction('contacts', 'readwrite');
          const store = tx.objectStore('contacts');
          await store.delete(id);
          await tx.done;
        } else {
          // Delete from SQLite
          await sqliteDbRef.current.runAsync(
            'DELETE FROM contacts WHERE id = ?',
            [id]
          );
        }

        dbEvents.emit('contacts-changed');
        NotificationManager.push({ message: 'Contact deleted', type: 'success' });
        } else {
          NotificationManager.push({
            message: res.message, 
            type: "error"
          })
        }
        // console.log(res);
        
      }, {
        method: 'POST',
        token,
        data: {
          id,
        }, 
        headers: {
          'Accept' : 'application/json' 
        }
      })
    } catch (e) {
      NotificationManager.push({ message: `failed. ${e.message}`, type: "error" })
    } finally {
      setLoading(false)
    }
  };

  //files and stories
  const clearAllMedia = async () => {
    if (Platform.OS !== "web") {
      try {
        const dir = FileSystem.documentDirectory;
        const files = await FileSystem.readDirectoryAsync(dir);

        for (const file of files) {
          const fileUri = dir + file;
          await FileSystem.deleteAsync(fileUri, { idempotent: true });
        }

        console.log("✅ All local media deleted successfully");
        return true
      } catch (err) {
        console.error("❌ Failed to clear media:", err);
        return false
      }
    }
    return true
  };
  const downloadUsersPP = async (token) => {
    if (!token) return;
    setLoading(true);

    const users = []

    if (Platform.OS === 'web') {
      const tx = idbRef.current.transaction('users_stored', 'readonly');
      const store = tx.objectStore('users_stored');
      const all = await store.getAll();
      
      all.forEach((u) => {
        users.push(u.id)
      })
    } else {
      const rows = await sqliteDbRef.current.getAllAsync(
        `SELECT * FROM users_stored ORDER BY name ASC`,
        []
      );
      
      rows.forEach((u) => {
        users.push(u.id)
      })
  
    }
    

    try {
      await axious('/api/users-pp', async (res) => {
        console.log("User Images:", res);

        if (res.success) {

          const pp = res.pp

          pp.forEach( async (pp) => {
            await updateOrInsert("files", {
              id: pp.id,
              text: pp.text,
              user_id: pp.user_id,
              file_path: FILE_URL+pp.file_path,
              file_type: pp.file_type,
              updated_at: pp.updated_at,
              synced: 1,
              deleted: 0,
            });
          })
          
        } else {
          NotificationManager.push({ message: res.message, type: "error" });
        }
      }, {
        method: "POST",
        token,
        data: {
          user_ids: users
        }
      });
    } catch (e) {
      NotificationManager.push({
        message: `failed. ${e.message}`,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  const getPPFile_id = async (user_id) => {
    if (Platform.OS === "web") {
      const tx = idbRef.current.transaction("files", "readonly");
      const store = tx.objectStore("files");
      const all = await store.getAll();
      const pp = all.find((p) => p.user_id == user_id && p.text === "p>p+");
      return pp?.id ?? null;
    } else {
      const pp = await sqliteDbRef.current.getAllAsync(
        `SELECT * FROM files WHERE user_id = ? AND text = 'p>p+' LIMIT 1`,
        [user_id]
      );
      return pp?.[0]?.id ?? null;
    }
  };

  const getMedia = async (file_id, token, c) => {
    let runCallback = false;
    let url = "";

    const callback = (data) => {
      console.log("Callback:", data);
      c?.(data);
    };

    // 🔹 1. Local fallback
    const fallback = async () => {
      try {
        if (Platform.OS === "web") {
          const tx = idbRef.current.transaction("files", "readonly");
          const store = tx.objectStore("files");
          const local = await store.get(file_id);

          if (local) {
            url = { url: local.file_path, type: local.file_type, state: "w1" };
            if (!runCallback) callback(url), (runCallback = true);
            return local;
          }
          return false;
        } else {
          const [local] = await sqliteDbRef.current.getAllAsync(
            "SELECT * FROM files WHERE id = ?",
            [file_id]
          );

          if (local) {
            if (local.local_storage) {
              const info = await FileSystem.getInfoAsync(local.local_storage);
              if (!info.exists || info.size < 10 * 1024) {
                console.warn("⚠️ Local file incomplete, clearing reference...");
                await sqliteDbRef.current.runAsync(
                  "UPDATE files SET local_storage = NULL WHERE id = ?",
                  [file_id]
                );

                if (local.file_path) {
                  url = { url: local.file_path, type: local.file_type, state: "m1" };
                  if (!runCallback) callback(url), (runCallback = true);
                }
                return false;
              }

              url = {
                url: local.local_storage,
                type: local.file_type,
                size: info.size,
                state: "m2",
              };
              if (!runCallback) callback(url), (runCallback = true);
              return local;
            } else if (local.file_path) {
              url = { url: local.file_path, type: local.file_type, state: "m3" };
              if (!runCallback) callback(url), (runCallback = true);
              return false;
            }
          }
        }
      } catch (e) {
        console.error("getMedia: local fallback error:", e);
        return false;
      }
    };

    // 🔹 2. Fetch file metadata from server (unchanged)
    const serverFile = async (serCallback) => {
      try {
        await axious(
          "/api/get-file",
          async (res) => {
            if (res.success && res.file) {
              const file = {
                id: res.file.id,
                text: res.file.text,
                user_id: res.file.user_id,
                file_path: FILE_URL + res.file.file_path,
                file_type: res.file.file_type,
                updated_at: res.file.updated_at,
                file_size: res.file.file_size || 0, // ✅ from server
              };
              serCallback(file);
            } else {
              serCallback(false);
              console.warn("getMedia: file not found or server error");
            }
          },
          { method: "POST", token, data: { file_id } }
        );
      } catch (e) {
        serCallback(false);
        console.warn("getMedia: network or axious error:", e);
      }
    };

    // 🔹 3. Try local first
    const fbck = await fallback();

    if (fbck) {
      console.log("✅ Fetched from local cache");
      serverFile(async (file) => {
        if (file && Platform.OS === "web") {
          await updateOrInsert("files", {
            id: file.id,
            text: file.text,
            user_id: file.user_id,
            file_path: file.file_path,
            file_type: file.file_type,
            updated_at: file.updated_at,
            synced: 1,
            deleted: 0,
          });
        } else {
          if (fbck?.file_path && fbck?.file_path != file?.file_path) {
            const ext =
              file.file_type === "video"
                ? ".mp4"
                : file.file_type === "image"
                ? ".jpg"
                : "";
            const fileUri = `${FileSystem.documentDirectory}${file.id}_${file.file_type}${ext}`;

            try {
              const result = await FileSystem.downloadAsync(file.file_path, fileUri);

              // ✅ Check file integrity by comparing size (±5% tolerance)
              const info = await FileSystem.getInfoAsync(result.uri);
              const localSize = info.size || 0;
              const expectedSize = Number(file.file_size) || 0;

              let isValid = true;
              if (expectedSize > 0) {
                const diff = Math.abs(localSize - expectedSize);
                isValid = diff / expectedSize < 0.05; // within 5%
              }

              if (!isValid) {
                console.warn("⚠️ Size mismatch — retrying download...");
                await FileSystem.deleteAsync(result.uri, { idempotent: true });

                const retry = await FileSystem.downloadAsync(file.file_path, fileUri);
                const retryInfo = await FileSystem.getInfoAsync(retry.uri);
                const retrySize = retryInfo.size || 0;

                const diffRetry = Math.abs(retrySize - expectedSize);
                const retryValid = diffRetry / expectedSize < 0.05;

                if (!retryValid) {
                  console.error("❌ Retry failed size validation, skipping save.");
                  return;
                }

                console.log("✅ Retry succeeded — saving file.");
                await sqliteDbRef.current.runAsync(
                  `
                    INSERT OR REPLACE INTO files (
                      id, user_id, text, file_path, local_storage, file_type, 
                      updated_at, synced, deleted, created_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, datetime('now'))
                  `,
                  [
                    file.id,
                    file.user_id,
                    file.text,
                    file.file_path,
                    retry.uri,
                    file.file_type,
                    file.updated_at,
                  ]
                );
                return;
              }

              // ✅ Size OK, save to DB
              await sqliteDbRef.current.runAsync(
                `
                  INSERT OR REPLACE INTO files (
                    id, user_id, text, file_path, local_storage, file_type, 
                    updated_at, synced, deleted, created_at
                  )
                  VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, datetime('now'))
                `,
                [
                  file.id,
                  file.user_id,
                  file.text,
                  file.file_path,
                  result.uri,
                  file.file_type,
                  file.updated_at,
                ]
              );

              console.log("✅ File saved locally (size verified)");
            } catch (err) {
              console.error("getMedia: download/save failed:", err);
            }
          }
        }
      });
    } else {
      console.log("⬇️ Not in local, downloading from server...");
      serverFile(async (file) => {
        if (!file) return;

        if (Platform.OS === "web") {
          url = { url: file.file_path, type: file.file_type, state: "w2" };
          if (!runCallback) callback(url), (runCallback = true);
          await updateOrInsert("files", {
            id: file.id,
            text: file.text,
            user_id: file.user_id,
            file_path: file.file_path,
            file_type: file.file_type,
            updated_at: file.updated_at,
            synced: 1,
            deleted: 0,
          });
        } else {
          url = { url: file.file_path, type: file.file_type, state: "m4" };
          if (!runCallback) callback(url), (runCallback = true);

          const ext =
            file.file_type === "video"
              ? ".mp4"
              : file.file_type === "image"
              ? ".jpg"
              : "";
          const fileUri = `${FileSystem.documentDirectory}${file.id}_${file.file_type}${ext}`;

          try {
            const result = await FileSystem.downloadAsync(file.file_path, fileUri);

            // ✅ Check file integrity by comparing size (±5% tolerance)
            const info = await FileSystem.getInfoAsync(result.uri);
            const localSize = info.size || 0;
            const expectedSize = Number(file.file_size) || 0;

            let isValid = true;
            if (expectedSize > 0) {
              const diff = Math.abs(localSize - expectedSize);
              isValid = diff / expectedSize < 0.05; // within 5%
            }

            if (!isValid) {
              console.warn("⚠️ Size mismatch — retrying download...");
              await FileSystem.deleteAsync(result.uri, { idempotent: true });

              const retry = await FileSystem.downloadAsync(file.file_path, fileUri);
              const retryInfo = await FileSystem.getInfoAsync(retry.uri);
              const retrySize = retryInfo.size || 0;

              const diffRetry = Math.abs(retrySize - expectedSize);
              const retryValid = diffRetry / expectedSize < 0.05;

              if (!retryValid) {
                console.error("❌ Retry failed size validation, skipping save.");
                return;
              }

              console.log("✅ Retry succeeded — saving file.");
              await sqliteDbRef.current.runAsync(
                `
                  INSERT OR REPLACE INTO files (
                    id, user_id, text, file_path, local_storage, file_type, 
                    updated_at, synced, deleted, created_at
                  )
                  VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, datetime('now'))
                `,
                [
                  file.id,
                  file.user_id,
                  file.text,
                  file.file_path,
                  retry.uri,
                  file.file_type,
                  file.updated_at,
                ]
              );
              return;
            }

            // ✅ Size OK, save to DB
            await sqliteDbRef.current.runAsync(
              `
                INSERT OR REPLACE INTO files (
                  id, user_id, text, file_path, local_storage, file_type, 
                  updated_at, synced, deleted, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, datetime('now'))
              `,
              [
                file.id,
                file.user_id,
                file.text,
                file.file_path,
                result.uri,
                file.file_type,
                file.updated_at,
              ]
            );

            console.log("✅ File saved locally (size verified)");
          } catch (err) {
            console.error("getMedia: download/save failed:", err);
          }
        }
      });
    }
  };


  const getUserProfilePicture = async (user_id, token, callback) => {
    try {
      

      const file_id = await getPPFile_id(user_id)
      
      console.log('working', file_id);

      // 2️⃣ If no local file record, fallback: fetch PP info from server
      if (!file_id) {
        await axious(
          "/api/users-pp",
          async (response) => {
            
            if (response.success && Array.isArray(response.pp)) {
              // Find that user's PP from the returned array
              const file = response.pp.find((f) => f.user_id == user_id);
              if (file) {
                await getMedia(file.id, token, (file) => {
                  callback?.(file)
                });
              }
            }
            callback?.(null)
          },
          {
            method: "POST",
            token,
            data: { user_ids: [user_id] },
          }
        );

        return
      }

      await getMedia(file_id, token, (file) => {
        callback?.(file)
        console.log("got the pp: ", file);
        
      });
      return
    } catch (error) {
      console.error("getUserProfilePicture error:", error);
      callback?.(null)
      return
    }
  };

  const removePP = async (user_id, callback) => {
    try {
      if (Platform.OS === 'web') {
        // Use readwrite because you're updating data
        const tx = idbRef.current.transaction("files", "readwrite");
        const store = tx.objectStore("files");
        const all = await store.getAll();
        
        const pp = all.find((p) => p.user_id == user_id && p.text === "p>p+");
        if (pp) {
          pp.file_path = null;
          pp.file_type = null;
          pp.local_storage = null; // also clear local_storage if you store it
          await store.put(pp);
        }

        await tx.done; // optional: ensures transaction completes

      } else {
        // Use parameter binding to safely insert nulls
        await sqliteDbRef.current.runAsync(
          `UPDATE files 
          SET file_path = ?, file_type = ?, local_storage = ? 
          WHERE user_id = ? AND text = 'p>p+'`,
          [null, null, null, user_id]
        );
      }

      callback?.(true);
    } catch (e) {
      console.error("removePP error:", e);
      callback?.(false);
    }
  };

  const InsertStories = async (stories_arr, token, callback) => {
    try {
      for (const stories of stories_arr) {
        if (!stories.id) return;
        
        await updateOrInsert("stories", {
          id: stories.id,
          text: stories?.text,
          file_id: stories?.file_id,
          user_id: stories.user_id,
          expires_at: stories.expires_at,          
          created_at: stories.created_at,
          updated_at: stories.updated_at,
          synced: 1,
          deleted: 0,
        });

        if (stories?.file_id) {
          await getMedia(stories.file_id, token, (file) => {
            console.log("Story file added: ",file)
          });
        }
      }


      dbEvents.emit('stories-changed');
      callback?.();
    } catch (e) {
      NotificationManager.push({ message: `failed. ${e.message}`, type: "error" })
    } finally {
      setLoading(false)
    }
  }


  const getStoriesLastUpdatedAt = async (callback) => {
    try {
      if (Platform.OS === 'web') {
        const tx = idbRef.current.transaction(
          ['stories',],
          'readonly'
        );

        const storiesStore = tx.objectStore('stories');

        const [allStories] = await Promise.all([
          storiesStore.getAll(),
        ]);

        const joinedStories = allStories
          .filter(story => story.updated_at)
          .sort((b, a) => new Date(a.updated_at) - new Date(b.updated_at));

        return joinedStories[0]
      } else {
        const storiesRaw = await sqliteDbRef.current.getAllAsync(
          `SELECT 
            *
          FROM stories c
          ORDER BY datetime(c.updated_at) DESC`,
          []
        );

        return storiesRaw[0];
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      return { error: true, message: error.message };
    }
  }

  const downloadStories = async (token, callback) => {
    try {
      await axious('/api/get-stories', async(res) => {
        console.log(res);
        if (res.success) {
          
          const serverStories = res.stories || [];

          let clientStories = [];
          if (Platform.OS === "web") {
            const tx = idbRef.current.transaction("stories", "readonly");
            const store = tx.objectStore("stories");
            clientStories = await store.getAll();
          } else {
            const result = await sqliteDbRef.current.getAllAsync(
              "SELECT * FROM stories"
            );
            clientStories = result || [];
          }

          const serverIds = new Set(serverStories.map(s => s.id));

          for (const s of clientStories) {
            if (!serverIds.has(s.id)) {
              if (Platform.OS === "web") {
                const tx = idbRef.current.transaction("stories", "readwrite");
                const store = tx.objectStore("stories");
                await store.delete(s.id);
              } else {
                await sqliteDbRef.current.runAsync(
                  "DELETE FROM stories WHERE id = ?",
                  [s.id]
                );
              }
            }
          }

          for (const stories of serverStories) {
            await updateOrInsert("stories", {
              id: stories.id,
              text: stories?.text,
              file_id: stories?.file_id,
              user_id: stories.user_id,
              expires_at: stories.expires_at,          
              created_at: stories.created_at,
              updated_at: stories.updated_at,
              synced: 1,
              deleted: 0,
            });
          }
        }
          
        dbEvents.emit('stories-changed');
        callback?.(res);
        
      }, {
        method: 'GET',
        token,
        headers: {
          'Accept' : 'application/json' 
        }
      })
    } catch (e) {
      NotificationManager.push({ message: `failed. ${e.message}`, type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const allStories = async (token, callback) => {
    if (Platform.OS === 'web') {
      const tx = idbRef.current.transaction(
        ['stories', 'contacts', 'files', 'viewed_stories'],
        'readonly'
      );

      const storiesStore = tx.objectStore('stories');
      const contStore = tx.objectStore('contacts');
      const filesStore = tx.objectStore('files');
      const viewedStore = tx.objectStore('viewed_stories');

      const [allStories, allContacts, allFiles, viewedStories] = await Promise.all([
        storiesStore.getAll(),
        contStore.getAll(),
        filesStore.getAll(),
        viewedStore.getAll()
      ]);

      const stories = allStories.map((story) => {
        story['file_url'] = story['file_type'] = story['name'] = ""
        story['viewed'] = false

        let retS = true

        if (!story?.file_id && !story?.text) {
          retS = false
        }

        if (story?.file_id) {
          let f = allFiles.find((f) => f.id == story.file_id)

          if (!f) {
            getMedia(story.file_id, token, (file) => {
              if (file?.type && file?.url) {
                story['file_url'] = file?.url
                story['file_type'] = file?.type
              }
            })
          } else {
            story['file_url'] = f?.file_path
            story['file_type'] = f?.file_type
          }
          
        }

        if (story?.user_id) {
          let u = allContacts.find((c) => c.recipient_id == story.user_id)

          if (u) {
            story['name'] = u?.name
          }
        } else {
          retS = false
        }

        let v = viewedStories.find((vi) => vi.id == story.id)

        if (v) {
          story['viewed'] = true
        }

        return retS ? story : ''  
      }).filter((s) => s).sort(
        (a, b) =>
        new Date(a.created_at || 0).getTime() -
        new Date(b.created_at || 0).getTime()
      );
      
      
      callback?.(stories);
    } else {
      try {
        const rows = await sqliteDbRef.current.getAllAsync(
          `SELECT s.id, s.text, s.user_id, s.file_id,
            f.local_storage AS file_url, f.file_type,
            s.expires_at, s.created_at, s.updated_at,
            c.name, v.viewed AS viewed
          FROM 
            stories s
          LEFT JOIN 
            contacts c ON s.user_id = c.recipient_id
          LEFT JOIN 
            files f ON s.file_id = f.id
          LEFT JOIN
            viewed_stories v ON s.id = v.id
          WHERE 
            (s.file_id IS NULL AND s.text IS NOT NULL)
            OR
            (s.file_id IS NOT NULL AND s.text IS NULL)
            OR
            (s.file_id IS NOT NULL AND s.text IS NOT NULL)
          ORDER BY 
            s.created_at ASC`
        );
        console.log("Mobile stories rows:", rows); // ✅ Log here
        callback?.(rows);
      } catch (e) {
        console.error("SQLite error:", e);
      }
    }
  }

  const getAStory = async (id) => {
    if (Platform.OS === 'web') {
      const tx = idbRef.current.transaction(
        ['stories', 'contacts'],
        'readonly'
      );
      const storiesStore = tx.objectStore('stories');
      const contStore = tx.objectStore('contacts');

      const [story, allContacts] = await Promise.all([
        storiesStore.get(id),
        contStore.getAll(),
      ]);

      if (!story) {
        return null       
      }

      story['file_url'] = story['file_type'] = story['name'] = ""

      if (!story?.file_id && !story?.text) {
        return null 
      }

      if (!story?.user_id) {
        return null
      }

      if (story?.file_id) {
        const txF = idbRef.current.transaction("files", "readonly");
        const storeF = txF.objectStore("files");

        const f = await storeF.get(Number(story.file_id));        

        if (f) {
          story.file_url = f.file_path;
          story.file_type = f.file_type;
        }
      }


      let u = allContacts.find((c) => c.recipient_id == story?.user_id)

      if (u) {
        story['name'] = u?.name
      }

      return story

    } else {
      try {
        const rows = await sqliteDbRef.current.getAllAsync(
          `SELECT s.id, s.text, s.user_id, s.file_id,
            f.local_storage AS file_url, f.file_type,
            s.expires_at, s.created_at, s.updated_at,
            c.name
          FROM 
            stories s
          LEFT JOIN 
            contacts c ON s.user_id = c.recipient_id
          LEFT JOIN 
            files f ON s.file_id = f.id
          WHERE 
            s.id = ?
            AND
            ((s.file_id IS NULL AND s.text IS NOT NULL)
            OR
            (s.file_id IS NOT NULL AND s.text IS NULL)
            OR
            (s.file_id IS NOT NULL AND s.text IS NOT NULL))
          ORDER BY 
            s.created_at ASC`,
          [id]
        );
        // console.log("story mobile rows", rows);
        
        return rows?.[0] || null
      } catch (e) {
        console.error("SQLite error:", e);
        return null
      }
    }
  }

  const deleteStory = async (id) => {
    if (Platform.OS === 'web') {
      const tx = idbRef.current.transaction('stories', 'readwrite');
      const store = tx.objectStore('stories');
      const story = await store.get(id);
      if (story) {
        story.file_id = null;
        story.text = null;
        await store.put(story);
      } 
    } else {
      await sqliteDbRef.current.runAsync(
        `UPDATE stories SET file_id = ?, text = ? WHERE id = ?`,
        [null, null, id]
      );
    }
    dbEvents.emit('stories-changed');
    return true
  }

  const cleanLocal_ = async () => {
    const now = Date.now();

    // 🕒 Delete expired stories
    if (Platform.OS === 'web') {
      try {
        const tx = idbRef.current.transaction('stories', 'readwrite');
        const store = tx.objectStore('stories');
        const allStories = await store.getAll();

        const expiredStories = allStories.filter(
          (s) => s.expires_at && new Date(s.expires_at).getTime() < now
        );

        if (expiredStories.length > 0) {
          for (const s of expiredStories) {
            await store.delete(s.id);
            console.log(`🗑️ Story ${s.id} deleted`);
          }
          dbEvents.emit('stories-changed');
        } else {
          console.log("No expired stories to delete");
        }
      } catch (error) {
        console.log("Error deleting expired stories:", error);
      }
    } else {
      try {
        const rows = await sqliteDbRef.current.getAllAsync(
          `SELECT * FROM stories WHERE expires_at < DATETIME('now')`
        );

        if (rows.length > 0) {
          for (const s of rows) {
            await sqliteDbRef.current.runAsync("DELETE FROM stories WHERE id = ?", [s.id]);
            console.log(`🗑️ Story ${s.id} deleted`);
          }
          dbEvents.emit('stories-changed');
        } else {
          console.log("No expired stories to delete");
        }
      } catch (e) {
        console.error("SQLite error:", e);
      }
    }

    // 🧹 Delete unused files
    await cleanFiles();
  };


  const cleanFiles = async () => {
    if (Platform.OS === 'web') {
      const tx = idbRef.current.transaction(
        ['stories', 'users_stored', 'files'],
        'readwrite'
      );

      const storiesStore = tx.objectStore('stories');
      const usersStored = tx.objectStore('users_stored');
      const filesStore = tx.objectStore('files');

      const [allStories, allUsers, allFiles] = await Promise.all([
        storiesStore.getAll(),
        usersStored.getAll(),
        filesStore.getAll()
      ]);

      let deletedCount = 0;

      for (const f of allFiles) {
        let delF = true;

        const story = allStories.find((s) => s.file_id == f.id);
        if (story) delF = false;

        if (f.text === "p>p+") {
          const user = allUsers.find((u) => u.id == f.user_id);
          if (user) delF = false;
        }

        if (delF) {
          await filesStore.delete(f.id);
          deletedCount++;
          console.log(`🗑️ File ${f.id} deleted`);
        }
      }

      if (deletedCount === 0) console.log("No unused files to delete");
    } else {
      try {
        const allStories = await sqliteDbRef.current.getAllAsync("SELECT id, file_id FROM stories");
        const allUsers = await sqliteDbRef.current.getAllAsync("SELECT id FROM users_stored");
        const allFiles = await sqliteDbRef.current.getAllAsync(
          "SELECT id, user_id, text, local_storage FROM files"
        );

        let deletedCount = 0;

        for (const f of allFiles) {
          let delF = true;

          const story = allStories.find((s) => s.file_id == f.id);
          if (story) delF = false;

          if (f.text === "p>p+") {
            const user = allUsers.find((u) => u.id == f.user_id);
            if (user) delF = false;
          }

          if (delF) {
            if (f.local_storage) {
              try {
                await FileSystem.deleteAsync(f.local_storage, { idempotent: true });
              } catch (err) {
                console.warn("Error deleting file from storage:", err.message);
              }
            }

            await sqliteDbRef.current.runAsync("DELETE FROM files WHERE id = ?", [f.id]);
            deletedCount++;
            console.log(`🗑️ File ${f.id} deleted`);
          }
        }

        if (deletedCount === 0) console.log("No unused files to delete");
      } catch (err) {
        console.error("Error cleaning files:", err);
      }
    }
  };

  const storeViewedStories = async (story_id ) => {
    if (story_id) {
      await updateOrInsert("viewed_stories", {
        id: story_id,
        viewed: 1,
        synced: 0,
        created_at: new Date().toISOString()
      });
      dbEvents.emit('stories-changed');
    }
  }

  // // ----------------------
  // // CRUD: CHATS/CONVERSATION/CONVERSATION PARTICIPANTS
  // // ----------------------


  const createMessage = async (conversationId, user_ids, token, current_user_id, message, messageType = "text", callback) => {

    
    if (conversationId) {
      //send new msg
      // console.log('sending old msg');
      const id = uuid.v4();
      const msg = {
        id,
        conversation_id: conversationId,
        sender_id: current_user_id,
        message,
        message_type: messageType,
        synced: 0,
        deleted: 0,
        created_at: new Date().toISOString(),
      };

      if (Platform.OS === 'web') {
        await idbRef.current.put('chats', msg);
      } else {
        await sqliteDbRef.current.runAsync(
          'INSERT INTO chats (id, conversation_id, sender_id, message, message_type, synced, deleted) VALUES (?, ?, ?, ?, ?, 0, 0)',
          id, msg.conversation_id, msg.sender_id, message, messageType
        );
      }

      dbEvents.emit('chats-changed');
      dbEvents.emit('conversations-changed');

      try {
        await axious('/api/send-message', async(res) => {
          if (res.success) {
            if (Platform.OS === 'web') {
              const tx = idbRef.current.transaction('chats', 'readwrite');
              const store = tx.objectStore('chats');
              let msg = await store.get(id);
              if (msg) {
                msg = res.sent_message;                
                await store.put(msg); // or store.put(msg, msg.id);
              }
            } else {
              await sqliteDbRef.current.runAsync(
                'UPDATE chats SET updated_at = ?, synced = 1 WHERE id = ?',
                [res.sent_message.updated_at, id]
              );
            }

            dbEvents.emit('chats-changed');
          }
          // console.log(res);
          
        }, {
          method: 'POST',
          token,
          data: {
            message,
            conversation_id: msg.conversation_id,
            client_id: msg.id
          }, 
          headers: {
            'Accept' : 'application/json' 
          }
        })
      } catch (e) {
        NotificationManager.push({ message: `failed. ${e.message}`, type: "error" })
      } finally {
        setLoading(false)
      }



      callback?.(msg)
    } else {
      //send to server, then save to client db

      try {
        await axious('/api/create-conversation', async(res) => {
          if (res.success) {
            const conversation = res.conversation

            if (!conversation) {
              NotificationManager.push({ message: 'an error occured creating conversation', type: 'error' })

              return
            }

            const conv = {
              id: conversation.id,
              type: conversation.type,
              name: conversation.name,
              synced: 1,
              deleted: 0,
              created_at: new Date().toISOString(),
            };

            if (Platform.OS === 'web') {
              await idbRef.current.put('conversations', conv);
            } else {
              await sqliteDbRef.current.runAsync(
                'INSERT INTO conversations (id, type, name, synced, deleted) VALUES ( ?, ?, ?, 1, 0)',
                conv.id, conv.type, conv.name
              );
            }

            dbEvents.emit('conversations-changed');

            const participants = conversation.participants || []

            if (participants.length<1) {
              NotificationManager.push({ message: 'an error occured adding participants', type: 'error' })

              return
            }

            participants.forEach( async participant => {
              const parti = {
                id: participant.id,
                conversation_id: participant.conversation_id,
                user_id: participant.user_id,
                email: participant.user.email,
                synced: 1,
                deleted: 0,
                created_at: new Date().toISOString(),
              };

              if (Platform.OS === 'web') {
                await idbRef.current.put('conversations_participants', parti);
              } else {
                await sqliteDbRef.current.runAsync(
                  'INSERT INTO conversations_participants (id, conversation_id, user_id, email, synced, deleted) VALUES ( ?, ?, ?, ?, 1, 0)',
                  parti.id, parti.conversation_id, parti.user_id, parti.email
                );
              }
            });

            dbEvents.emit('conversations_participants-changed');

            //send new msg
            const id = uuid.v4();
            const msg = {
              id,
              conversation_id: conv.id,
              sender_id: current_user_id,
              message,
              message_type: messageType,
              synced: 0,
              deleted: 0,
              created_at: new Date().toISOString(),
            };

            if (Platform.OS === 'web') {
              await idbRef.current.put('chats', msg);
            } else {
              await sqliteDbRef.current.runAsync(
                'INSERT INTO chats (id, conversation_id, sender_id, message, message_type, synced, deleted) VALUES (?, ?, ?, ?, ?, 0, 0)',
                id, msg.conversation_id, msg.sender_id, message, messageType
              );
            }

            dbEvents.emit('chats-changed');

            try {
              await axious('/api/send-message', async(res) => {
                if (res.success) {
                  if (Platform.OS === 'web') {
                    const tx = idbRef.current.transaction('chats', 'readwrite');
                    const store = tx.objectStore('chats');
                    const msg = await store.get(id);
                    if (msg) {
                      msg.synced = 1;
                      await store.put(msg);
                    }
                  } else {
                    await sqliteDbRef.current.runAsync(
                      'UPDATE chats SET synced = 1 WHERE id = ?',
                      [id]
                    );
                  }

                  dbEvents.emit('chats-changed');
                }
                console.log(res);
                
              }, {
                method: 'POST',
                token,
                data: {
                  message,
                  conversation_id: msg.conversation_id,
                  client_id: msg.id
                }, 
                headers: {
                  'Accept' : 'application/json' 
                }
              })
            } catch (e) {
              NotificationManager.push({ message: `failed. ${e.message}`, type: "error" })
            } finally {
              setLoading(false)
            }



            callback?.(msg);
          } else {
            NotificationManager.push({
              message: res.message, 
              type: "error"
            })
          }
          
        }, {
          method: 'POST',
          token,
          data: {
            user_ids,
            type: 'single'
          }, 
          headers: {
            'Accept' : 'application/json' 
          }
        })
      } catch (e) {
        NotificationManager.push({ message: `failed. ${e.message}`, type: "error" })
      } finally {
        setLoading(false)
      }
    }
  };

  const getMessages = async (conversationId, user_id, callback) => {
    try {
      if (Platform.OS === 'web') {
        const tx = idbRef.current.transaction(
          ['chats', 'conversations', 'conversations_participants', 'contacts'],
          'readonly'
        );

        const chatsStore = tx.objectStore('chats');
        const convStore = tx.objectStore('conversations');
        const partStore = tx.objectStore('conversations_participants');
        const contactStore = tx.objectStore('contacts');

        const [allChats, allConvs, allParts, allContacts] = await Promise.all([
          chatsStore.getAll(),
          convStore.getAll(),
          partStore.getAll(),
          contactStore.getAll()
        ]);

        const participants = allParts.filter(
          p => String(p.conversation_id) === String(conversationId) && !p.deleted
        );

        const conversations = allConvs.filter(
          c => String(c.id) === String(conversationId) && !c.deleted
        );

        const contacts = allContacts.filter(
          c => String(c.creator_id) === String(user_id)
        );

        // --- LEFT JOIN for conversations (attach participants + contacts)
        const joinedConversations = conversations
          .map(conv => {
            const convParticipants = participants.filter(
              p => String(p.conversation_id) === String(conv.id)
            );

            const participantWithContact = convParticipants.map(p => ({
              ...p,
              contact:
                contacts.find(c => String(c.recipient_id) === String(p.user_id)) || null
            }));

            return {
              ...conv,
              participants: participantWithContact
            };
          })
          .sort(
            (a, b) =>
              new Date(a.created_at || 0).getTime() -
              new Date(b.created_at || 0).getTime()
          )[0] || null;

        // --- LEFT JOIN for conversation_participants (attach contacts)
        const joinedParticipants = participants
          .map(p => ({
            ...p,
            contact:
              contacts.find(c => String(c.recipient_id) === String(p.user_id)) || null
          }))
          .sort(
            (a, b) =>
              new Date(a.created_at || 0).getTime() -
              new Date(b.created_at || 0).getTime()
          );

        // --- LEFT JOIN for chats (attach participant + contact)
        const joinedChats = allChats
          .filter(
            m => String(m.conversation_id) === String(conversationId) && !m.deleted
          )
          .map(chat => {
            const participant = participants.find(
              p => String(p.user_id) === String(chat.sender_id)
            );
            const contact = contacts.find(
              c => String(c.recipient_id) === String(chat.sender_id)
            );

            return {
              ...chat,
              participant: participant
                ? {
                    ...participant,
                    contact:
                      contacts.find(
                        c => String(c.recipient_id) === String(participant.user_id)
                      ) || null
                  }
                : null,
              contact: contact || null
            };
          })
          .sort(
            (b, a) =>
              new Date(a.created_at || 0).getTime() -
              new Date(b.created_at || 0).getTime()
          );

        callback({
          chats: joinedChats,
          conversation: joinedConversations,
          conversations_participants: joinedParticipants
        });

      } else {
        // Native (SQLite) — no changes
        const chatsRaw = await sqliteDbRef.current.getAllAsync(
          `SELECT 
            c.*, 
            cp.id AS cp_id, cp.user_id AS cp_user_id, cp.created_at AS cp_created_at, cp.deleted AS cp_deleted,
            ct.id AS contact_id, ct.name AS contact_name, cp.email AS contact_email, ct.creator_id AS contact_creator_id,
            ct.deleted AS contact_deleted, ct.recipient_id AS contact_recipient_id, ct.synced AS contact_synced
          FROM chats c
          LEFT JOIN conversations_participants cp 
            ON c.sender_id = cp.user_id AND cp.conversation_id = c.conversation_id
          LEFT JOIN contacts ct 
            ON cp.user_id = ct.recipient_id AND ct.creator_id = ?
          WHERE c.conversation_id = ? AND c.deleted = 0
          ORDER BY datetime(c.created_at) DESC`,
          [user_id, conversationId]
        );

        // Now restructure rows into nested objects
        const chats = chatsRaw.map(row => ({
          // base chat columns
          id: row.id,
          conversation_id: row.conversation_id,
          message: row.message,
          message_type: row.message_type,
          created_at: row.created_at,
          sender_id: row.sender_id,
          recipient_id: row.recipient_id,
          synced: row.synced,
          deleted: row.deleted,
          user_id: row.user_id,

          // nest participant
          participant: row.cp_id
            ? {
                id: row.cp_id,
                user_id: row.cp_user_id,
                created_at: row.cp_created_at,
                deleted: row.cp_deleted,
                email: row.contact_email,
                // nest contact inside participant
                contact: row.contact_id
                  ? {
                      id: row.contact_id,
                      name: row.contact_name,
                      creator_id: row.contact_creator_id,
                      deleted: row.contact_deleted,
                      recipient_id: row.contact_recipient_id,
                      synced: row.contact_synced
                    }
                  : null
              }
            : null
        }));
        //

        const conversationsRaw = await sqliteDbRef.current.getAllAsync(
          `SELECT 
              c.id as conversation_id,
              c.name as conversation_name,
              c.type as conversation_type,
              c.created_at as conversation_created_at,
              c.deleted as conversation_deleted,
              cp.id as participant_id,
              cp.user_id as participant_user_id,
              cp.created_at as participant_created_at,
              ct.id as contact_id,
              ct.name as contact_name,
              cp.email as contact_email,
              ct.recipient_id as contact_recipient_id
            FROM conversations c
            LEFT JOIN conversations_participants cp 
              ON c.id = cp.conversation_id
            LEFT JOIN contacts ct 
              ON cp.user_id = ct.recipient_id 
              AND ct.creator_id = ?
            WHERE c.id = ? AND c.deleted = 0
            ORDER BY c.created_at ASC`,
          [user_id, conversationId]
        );

        const conversation = conversationsRaw.length
          ? {
              id: conversationsRaw[0].conversation_id,
              name: conversationsRaw[0].conversation_name,
              type: conversationsRaw[0].conversation_type,
              created_at: conversationsRaw[0].conversation_created_at,
              deleted: conversationsRaw[0].conversation_deleted,
              participants: conversationsRaw
                .filter(row => row.participant_id) // ignore null participant rows
                .map(row => ({
                  id: row.participant_id,
                  user_id: row.participant_user_id,
                  created_at: row.participant_created_at,
                  email: row.contact_email,
                  contact: row.contact_id
                    ? {
                        id: row.contact_id,
                        name: row.contact_name,
                        recipient_id: row.contact_recipient_id
                      }
                    : null
                }))
            }
          : null;

        const participantsRaw = await sqliteDbRef.current.getAllAsync(
          `SELECT 
            cp.*, 
            ct.id AS contact_id, ct.name AS contact_name, cp.email AS contact_email, ct.creator_id AS contact_creator_id,
            ct.deleted AS contact_deleted, ct.recipient_id AS contact_recipient_id, ct.synced AS contact_synced
          FROM conversations_participants cp
          LEFT JOIN contacts ct 
            ON cp.user_id = ct.recipient_id AND ct.creator_id = ?
          WHERE cp.conversation_id = ? AND cp.deleted = 0
          ORDER BY cp.created_at ASC`,
          [user_id, conversationId]
        );

        const participants = participantsRaw.map(row => ({
          id: row.id,
          user_id: row.user_id,
          conversation_id: row.conversation_id,
          created_at: row.created_at,
          deleted: row.deleted,
          synced: row.synced,
          email: row.contact_email,
          contact: row.contact_id
            ? {
                id: row.contact_id,
                name: row.contact_name,
                creator_id: row.contact_creator_id,
                deleted: row.contact_deleted,
                recipient_id: row.contact_recipient_id,
                synced: row.contact_synced
              }
            : null
        }));


        callback({
          chats,
          conversation,
          conversations_participants: participants
        });
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      callback({ error: true, message: error.message });
    }
  };

  const getAllConversations = async (user_id, callback) => {
    try {
      if (Platform.OS === 'web') {
        // --- IndexedDB Version ---
        const tx = idbRef.current.transaction(
          ['chats', 'conversations', 'conversations_participants', 'contacts'],
          'readonly'
        );

        const chatsStore = tx.objectStore('chats');
        const convStore = tx.objectStore('conversations');
        const partStore = tx.objectStore('conversations_participants');
        const contactStore = tx.objectStore('contacts');

        const [allChats, allConvs, allParts, allContacts] = await Promise.all([
          chatsStore.getAll(),
          convStore.getAll(),
          partStore.getAll(),
          contactStore.getAll()
        ]);

        const contacts = allContacts.filter(c => String(c.creator_id) === String(user_id));

        // --- JOIN Conversations with Participants and Contacts ---
        const conversations = allConvs
          .filter(c => !c.deleted)
          .map(conv => {
            const convParticipants = allParts.filter(
              p => String(p.conversation_id) === String(conv.id) && !p.deleted
            );

            const participantsWithContact = convParticipants.map(p => ({
              ...p,
              contact: contacts.find(c => String(c.recipient_id) === String(p.user_id)) || null
            }));

            // Get only the last chat for this conversation
            const lastChat = allChats
              .filter(m => String(m.conversation_id) === String(conv.id) && !m.deleted)
              .sort(
                (a, b) =>
                  new Date(b.created_at || 0).getTime() -
                  new Date(a.created_at || 0).getTime()
              )[0] || null;

            return {
              ...conv,
              participants: participantsWithContact,
              last_chat: lastChat
                ? {
                    ...lastChat,
                    participant: participantsWithContact.find(
                      p => String(p.user_id) === String(lastChat.sender_id)
                    ) || null
                  }
                : null
            };
          })
          .sort(
            (a, b) =>
              new Date(b.last_chat?.created_at || b.created_at || 0).getTime() -
              new Date(a.last_chat?.created_at || a.created_at || 0).getTime()
          );

        callback(conversations);

      } else {
        // --- SQLite Version ---
        // Fetch all conversations with participants and contacts
        const conversationsRaw = await sqliteDbRef.current.getAllAsync(
          `SELECT 
            c.id as conversation_id,
            c.name as conversation_name,
            c.type as conversation_type,
            c.created_at as conversation_created_at,
            c.deleted as conversation_deleted,
            cp.id as participant_id,
            cp.user_id as participant_user_id,
            cp.created_at as participant_created_at,
            cp.deleted as participant_deleted,
            ct.id as contact_id,
            ct.name as contact_name,
            cp.email as contact_email,
            ct.recipient_id as contact_recipient_id,
            ct.creator_id as contact_creator_id,
            ct.deleted as contact_deleted,
            ct.synced as contact_synced
          FROM conversations c
          LEFT JOIN conversations_participants cp 
            ON c.id = cp.conversation_id
          LEFT JOIN contacts ct 
            ON cp.user_id = ct.recipient_id AND ct.creator_id = ?
          WHERE c.deleted = 0
          ORDER BY c.created_at ASC`,
          [user_id]
        );

        // Group by conversation
        const conversationsMap = {};
        conversationsRaw.forEach(row => {
          if (!conversationsMap[row.conversation_id]) {
            conversationsMap[row.conversation_id] = {
              id: row.conversation_id,
              name: row.conversation_name,
              type: row.conversation_type,
              created_at: row.conversation_created_at,
              deleted: row.conversation_deleted,
              participants: []
            };
          }

          if (row.participant_id) {
            conversationsMap[row.conversation_id].participants.push({
              id: row.participant_id,
              user_id: row.participant_user_id,
              created_at: row.participant_created_at,
              deleted: row.participant_deleted,
              email: row.contact_email,
              contact: row.contact_id
                ? {
                    id: row.contact_id,
                    name: row.contact_name,
                    recipient_id: row.contact_recipient_id,
                    creator_id: row.contact_creator_id,
                    deleted: row.contact_deleted,
                    synced: row.contact_synced
                  }
                : null
            });
          }
        });

        const conversationIds = Object.keys(conversationsMap);

        // Fetch last chat per conversation (optimized with GROUP BY)
        const chatsRaw = await sqliteDbRef.current.getAllAsync(
          `SELECT c1.*
          FROM chats c1
          INNER JOIN (
            SELECT conversation_id, MAX(created_at) AS max_created_at
            FROM chats
            WHERE deleted = 0
            GROUP BY conversation_id
          ) c2 ON c1.conversation_id = c2.conversation_id 
          AND c1.created_at = c2.max_created_at`
        );

        // Attach last chat to conversation
        chatsRaw.forEach(chat => {
          if (conversationsMap[chat.conversation_id]) {
            conversationsMap[chat.conversation_id].last_chat = chat;
          }
        });

        // Convert map to array and sort by last_chat date
        const conversations = Object.values(conversationsMap).sort(
          (a, b) =>
            new Date(b.last_chat?.created_at || b.created_at || 0).getTime() -
            new Date(a.last_chat?.created_at || a.created_at || 0).getTime()
        );

        callback(conversations);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      callback({ error: true, message: error.message });
    }
  };

  const conversationExist = async (user_id, user2id, callback) => {
    try {
      if (Platform.OS === 'web') {
        // --- IndexedDB ---
        const tx = idbRef.current.transaction(['conversations_participants'], 'readonly');
        const partStore = tx.objectStore('conversations_participants');

        const allParts = await partStore.getAll();

        // Build the target participant set (handles self too)
        const targetSet = [...new Set([String(user_id), String(user2id)])];

        // Get all conversationIds for user_id
        const convsOfA = allParts
          .filter(p => String(p.user_id) === String(user_id) && !p.deleted)
          .map(p => p.conversation_id);

        for (const convId of convsOfA) {
          // Get all participants for this conversation
          const participants = allParts
            .filter(p => String(p.conversation_id) === String(convId) && !p.deleted)
            .map(p => String(p.user_id));

          const uniqueParts = [...new Set(participants)];

          // Compare: both sets must match exactly
          if (
            uniqueParts.length === targetSet.length &&
            uniqueParts.every(u => targetSet.includes(u))
          ) {
            return callback?.(convId);
          }
        }

        return callback?.(null); // ❌ no matching conversation found

      } else {
        // --- SQLite ---
        const sql = `
          SELECT c.id as conversation_id
          FROM conversations c
          JOIN conversations_participants p ON p.conversation_id = c.id
          WHERE c.deleted = 0
          GROUP BY c.id
          HAVING 
            COUNT(DISTINCT p.user_id) = ?
            AND SUM(p.user_id IN (?, ?)) = ?
          LIMIT 1
        `;

        // if self-chat → need 1 participant
        const isSelf = String(user_id) === String(user2id);
        const expectedCount = isSelf ? 1 : 2;

        const result = await sqliteDbRef.current.getAllAsync(sql, [
          expectedCount,
          user_id,
          user2id,
          expectedCount
        ]);

        if (result.length > 0) {
          return callback?.(result[0].conversation_id);
        }

        return callback?.(null);
      }
    } catch (err) {
      console.error('Error in checkConversationExists:', err);
      throw err;
    }
  };

  const getChatLastUpdatedAt = async (callback) => {
    try {
      if (Platform.OS === 'web') {
        const tx = idbRef.current.transaction(
          ['chats',],
          'readonly'
        );

        const chatsStore = tx.objectStore('chats');

        const [allChats] = await Promise.all([
          chatsStore.getAll(),
        ]);

        const joinedChats = allChats
          .filter(chat => chat.updated_at)
          .sort((b, a) => new Date(a.updated_at) - new Date(b.updated_at));

        // callback?.(joinedChats[0]);
        return joinedChats[0]

      } else {
        // Native (SQLite) — no changes
        const chatsRaw = await sqliteDbRef.current.getAllAsync(
          `SELECT 
            *
          FROM chats c
          ORDER BY datetime(c.updated_at) DESC`,
          []
        );

        // callback?.(chatsRaw[0]);
        return chatsRaw[0]
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      // callback({ error: true, message: error.message });
      return { error: true, message: error.message }
    }
  };

  const downloadMessages = async (token, callback) => {
    try {
      await axious('/api/download-messages', async(res) => {
        if (res.success) {
          const serverConversation = res.conversations || [];

          let clientConversation = [];
          if (Platform.OS === "web") {
            const tx = idbRef.current.transaction("conversations", "readonly");
            const store = tx.objectStore("conversations");
            clientConversation = await store.getAll();
          } else {
            const result = await sqliteDbRef.current.getAllAsync(
              "SELECT * FROM conversations"
            );
            clientConversation = result || [];
          }

          const serverIds = new Set(serverConversation.map(c => c.id));

          for (const c of clientConversation) {
            if (!serverIds.has(c.id)) {
              if (Platform.OS === "web") {
                const tx = idbRef.current.transaction("conversations", "readwrite");
                const store = tx.objectStore("conversations");
                await store.delete(c.id);
              } else {
                await sqliteDbRef.current.runAsync(
                  "DELETE FROM conversations WHERE id = ?",
                  [c.id]
                );
              }
            }
          }

          for (const conversation of serverConversation) {
            await updateOrInsert("conversations", {
              id: conversation.id,
              name: conversation.name,
              type: conversation.type,
              created_at: conversation.created_at,
              updated_at: conversation.updated_at,
              synced: 1,
              deleted: 0,
            });
          }


          const serverChats = res.chats || [];

          let clientchat = [];
          if (Platform.OS === "web") {
            const tx = idbRef.current.transaction("chats", "readonly");
            const store = tx.objectStore("chats");
            clientchat = await store.getAll();
          } else {
            const result = await sqliteDbRef.current.getAllAsync(
              "SELECT * FROM chats"
            );
            clientchat = result || [];
          }

          const serverChatsids = new Set(serverChats.map(c => c.id));

          for (const c of clientchat) {
            if (!serverChatsids.has(c.id)) {
              if (Platform.OS === "web") {
                const tx = idbRef.current.transaction("chats", "readwrite");
                const store = tx.objectStore("chats");
                await store.delete(c.id);
              } else {
                await sqliteDbRef.current.runAsync(
                  "DELETE FROM chats WHERE id = ?",
                  [c.id]
                );
              }
            }
          }

          for (const chat of serverChats) {
            if (chat.id) {
              await updateOrInsert("chats", {
                id: chat.id,
                conversation_id: chat.conversation_id,
                sender_id: chat.sender_id,
                message: chat.message,
                message_type: chat.message_type,
                created_at: chat.created_at,
                updated_at: chat.updated_at,
                synced: 1,
                deleted: 0,
              });
            }
          }

          const serverParticipants = res.participants || [];

          // 1. Get all client participants
          let clientparticipants = [];
          if (Platform.OS === "web") {
            const tx = idbRef.current.transaction("conversations_participants", "readonly");
            const store = tx.objectStore("conversations_participants");
            clientparticipants = await store.getAll();
          } else {
            const result = await sqliteDbRef.current.getAllAsync(
              "SELECT * FROM conversations_participants"
            );
            clientparticipants = result || [];
          }

          const serverParticipantsIds = new Set(serverParticipants.map(c => c.id));

          for (const c of clientparticipants) {
            if (!serverParticipantsIds.has(c.id)) {
              if (Platform.OS === "web") {
                const tx = idbRef.current.transaction("conversations_participants", "readwrite");
                const store = tx.objectStore("conversations_participants");
                await store.delete(c.id);
              } else {
                await sqliteDbRef.current.runAsync(
                  "DELETE FROM conversations_participants WHERE id = ?",
                  [c.id]
                );
              }
            }
          }

          for (const participants of serverParticipants) {
            await updateOrInsert("conversations_participants", {
              id: participants.id,
              conversation_id: participants.conversation_id,
              user_id: participants.user_id,
              email: participants.user.email,
              created_at: participants.created_at,
              updated_at: participants.updated_at,
              synced: 1,
              deleted: 0,
            });
            if (participants?.user_id) {
              console.log("inserting into users_stored 3");
              
              await updateOrInsert("users_stored", {
                id: participants?.user_id,
                email: participants?.user?.email
              });
            }
            
            
          }
        }
          
        dbEvents.emit('conversations_participants-changed');
        dbEvents.emit('chats-changed');
        dbEvents.emit('conversations-changed');
        callback?.(res);
        
      }, {
        method: 'POST',
        token,
        headers: {
          'Accept' : 'application/json' 
        }
      })
    } catch (e) {
      NotificationManager.push({ message: `failed. ${e.message}`, type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const InsertChats = async (chat_arr, callback) => {
    try {
      for (const chat of chat_arr) {
        if (!chat.id) return;
        
        await updateOrInsert("chats", {
          id: chat.id,
          conversation_id: chat.conversation_id,
          message: chat.message,
          message_type: chat.message_type,
          sender_id: chat.sender_id,          
          created_at: chat.created_at,
          updated_at: chat.updated_at,
          synced: 1,
          deleted: 0,
        });
      }


      dbEvents.emit('conversations_participants-changed');
      dbEvents.emit('chats-changed');
      dbEvents.emit('conversations-changed');
      callback?.();
    } catch (e) {
      NotificationManager.push({ message: `failed. ${e.message}`, type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const clearClientMessages = async () => {
    if (Platform.OS === 'web') {
      await idbRef.current.clear('conversations');
    } else {
      await sqliteDbRef.current.runAsync('DELETE FROM conversations');
    }

    if (Platform.OS === 'web') {
      await idbRef.current.clear('chats');
    } else {
      await sqliteDbRef.current.runAsync('DELETE FROM chats');
    }

    if (Platform.OS === 'web') {
      await idbRef.current.clear('conversations_participants');
    } else {
      await sqliteDbRef.current.runAsync('DELETE FROM conversations_participants');
    }

    if (Platform.OS === 'web') {
      await idbRef.current.clear('files');
    } else {
      await sqliteDbRef.current.runAsync('DELETE FROM files');
    }

    if (Platform.OS === 'web') {
      await idbRef.current.clear('users_stored');
    } else {
      await sqliteDbRef.current.runAsync('DELETE FROM users_stored');
    }

    if (Platform.OS === 'web') {
      await idbRef.current.clear('stories');
    } else {
      await sqliteDbRef.current.runAsync('DELETE FROM stories');
    }

    if (Platform.OS === 'web') {
      await idbRef.current.clear('viewed_stories');
    } else {
      await sqliteDbRef.current.runAsync('DELETE FROM viewed_stories');
    }

    await clearAllMedia()

    dbEvents.emit('contacts-changed');
  };

  // const getMessages = async (conversationId, callback) => {
  //   if (Platform.OS === 'web') {
  //     const tx = idbRef.current.transaction('chats', 'readonly');
  //     const store = tx.objectStore('chats');
  //     const all = await store.getAll();
  //     const filtered = all
  //       .filter(m => m.conversation_id === conversationId && !m.deleted)
  //       .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  //     callback(filtered);
  //   } else {
  //     const rows = await sqliteDbRef.current.getAllAsync(
  //       `SELECT * FROM chats WHERE conversation_id = ? AND deleted = 0 ORDER BY created_at ASC`,
  //       [conversationId]
  //     );
  //     callback(rows);
  //   }
  // };

  // const deleteMessage = async (id, callback) => {
  //   if (Platform.OS === 'web') {
  //     const tx = idbRef.current.transaction('chats', 'readwrite');
  //     const store = tx.objectStore('chats');
  //     const msg = await store.get(id);
  //     if (msg) {
  //       msg.deleted = 1;
  //       msg.synced = 0;
  //       await store.put(msg);
  //       callback?.(msg);
  //     }
  //   } else {
  //     await sqliteDbRef.current.runAsync(
  //       'UPDATE chats SET deleted = 1, synced = 0 WHERE id = ?',
  //       id
  //     );
  //     callback?.(id);
  //   }
  //   dbEvents.emit('chats-changed');
  // };

  // // ----------------------
  // // SYNC FUNCTION FOR CHATS
  // // ----------------------
  // const syncMessages = async (serverUrl, userId) => {
  //   if (!sqliteDbRef.current && !idbRef.current) return;

  //   // 1. Get unsynced messages
  //   let unsynced = [];
  //   if (Platform.OS === 'web') {
  //     const tx = idbRef.current.transaction('chats', 'readonly');
  //     const store = tx.objectStore('chats');
  //     unsynced = (await store.getAll()).filter(m => m.synced === 0);
  //   } else {
  //     unsynced = await sqliteDbRef.current.getAllAsync(`SELECT * FROM chats WHERE synced = 0`);
  //   }

  //   // 2. Push unsynced messages to server
  //   if (unsynced.length > 0) {
  //     try {
  //       await fetch(`${serverUrl}/sync`, {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify({ messages: unsynced, user_id: userId }),
  //       });

  //       // Mark them as synced locally
  //       if (Platform.OS === 'web') {
  //         const tx = idbRef.current.transaction('chats', 'readwrite');
  //         const store = tx.objectStore('chats');
  //         for (let m of unsynced) {
  //           m.synced = 1;
  //           await store.put(m);
  //         }
  //       } else {
  //         await sqliteDbRef.current.runAsync(`UPDATE chats SET synced = 1 WHERE synced = 0`);
  //       }
  //     } catch (err) {
  //       console.error("❌ Failed to sync messages:", err);
  //     }
  //   }

  //   // 3. Pull new messages from server
  //   try {
  //     const res = await fetch(`${serverUrl}/fetch?user_id=${userId}`);
  //     const newMessages = await res.json();

  //     for (const msg of newMessages) {
  //       if (Platform.OS === 'web') {
  //         await idbRef.current.put('chats', msg);
  //       } else {
  //         await sqliteDbRef.current.runAsync(
  //           'INSERT OR REPLACE INTO chats (id, conversation_id, sender_id, message, message_type, synced, deleted, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  //           msg.id, msg.conversation_id, msg.sender_id, msg.message, msg.message_type, 1, 0, msg.created_at
  //         );
  //       }
  //     }

  //     if (newMessages.length > 0) {
  //       dbEvents.emit('chats-changed');
  //     }
  //   } catch (err) {
  //     console.error("❌ Failed to fetch new messages:", err);
  //   }
  // };

  return {
    isReady,
    loading,
    createContact,
    refreshContacts,
    getAllContacts,
    getContact,
    clearClientContact,
    editContact,
    deleteContact,
    createMessage,
    getMessages,
    getAllConversations,
    downloadMessages,
    clearClientMessages,
    conversationExist,
    getChatLastUpdatedAt,
    InsertChats,
    // downloadUsersPP,
    getUserProfilePicture,
    getMedia,
    removePP,
    InsertStories,
    downloadStories,
    getStoriesLastUpdatedAt,
    allStories,
    deleteStory,
    getAStory,
    cleanLocal_,
    storeViewedStories
  };
};
