from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import FileResponse, JSONResponse
import os
import base64
from typing import Dict, Any

router = APIRouter(
    prefix="/api",
    tags=["audio-segments"],
)

# Placeholder getter for the global instance (will be replaced by proper DI later)
def get_warning_system():
    import backend.application.ai_analysis.analyzer as analyzer_module
    return analyzer_module.warning_system

@router.get('/audio-segments')
async def get_audio_segments():
    """Get all stored audio segments metadata"""
    try:
        warning_system = get_warning_system()
        if not warning_system:
            return JSONResponse({"success": False, "error": "System not initialized"}, status_code=503)
        
        segments = warning_system.get_all_segments()
        return {
            'success': True,
            'segments': segments,
            'total_count': len(segments)
        }
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)

@router.get('/audio-segment/{segment_id}')
async def get_audio_segment(segment_id: str):
    """Get specific audio segment metadata"""
    try:
        warning_system = get_warning_system()
        segment = warning_system.get_audio_segment_info(segment_id)
        if segment:
            return {
                'success': True,
                'segment': segment
            }
        else:
            raise HTTPException(status_code=404, detail="Segment not found")
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)

@router.get('/audio-segment/{segment_id}/play')
async def play_audio_segment(segment_id: str):
    """Serve audio file for playback"""
    try:
        warning_system = get_warning_system()
        segment = warning_system.get_audio_segment_info(segment_id)
        if segment and os.path.exists(segment['file_path']):
            return FileResponse(
                path=segment['file_path'],
                media_type='audio/wav',
                filename=segment['filename']
            )
        else:
            raise HTTPException(status_code=404, detail="Audio file not found")
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)

@router.get('/audio-segment/{segment_id}/download')
async def download_audio_segment(segment_id: str):
    """Download audio file"""
    try:
        warning_system = get_warning_system()
        segment = warning_system.get_audio_segment_info(segment_id)
        if segment and os.path.exists(segment['file_path']):
            return FileResponse(
                path=segment['file_path'],
                media_type='audio/wav',
                filename=segment['filename'],
                headers={"Content-Disposition": f"attachment; filename={segment['filename']}"}
            )
        else:
            raise HTTPException(status_code=404, detail="Audio file not found")
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)

@router.delete('/audio-segment/{segment_id}')
async def delete_audio_segment(segment_id: str):
    """Delete specific audio segment"""
    try:
        warning_system = get_warning_system()
        success = warning_system.delete_audio_segment(segment_id)
        if success:
            return {
                'success': True,
                'message': 'Segment deleted successfully'
            }
        else:
            raise HTTPException(status_code=404, detail="Segment not found")
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)

@router.get('/audio-segment/{segment_id}/base64')
async def get_audio_segment_base64(segment_id: str):
    """Get audio segment as base64 encoded string"""
    try:
        warning_system = get_warning_system()
        segment = warning_system.get_audio_segment_info(segment_id)
        if segment and os.path.exists(segment['file_path']):
            with open(segment['file_path'], 'rb') as audio_file:
                audio_data = audio_file.read()
                base64_audio = base64.b64encode(audio_data).decode('utf-8')

            return {
                'success': True,
                'audio_base64': base64_audio,
                'segment_info': segment
            }
        else:
            raise HTTPException(status_code=404, detail="Audio file not found")
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)

@router.get('/status')
async def get_system_status():
    """Get system status"""
    warning_system = get_warning_system()
    if not warning_system:
        return {"success": False, "status": "stopped", "error": "System not initialized"}
        
    return {
        'success': True,
        'status': 'running' if warning_system.is_running else 'stopped',
        'stored_segments': len(warning_system.stored_segments),
        'storage_directory': warning_system.AUDIO_STORAGE_DIR
    }
