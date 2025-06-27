using MachineMonitoring.Hubs;
using MachineMonitoring.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;

namespace MachineMonitoring.Controllers.API
{
    [Route("api/[controller]")]
    [ApiController]
    public class NotificationController : ControllerBase
    {
        private readonly IHubContext<NotificationHub> _hubContext;

        public NotificationController(IHubContext<NotificationHub> hubContext)
        {
            _hubContext = hubContext;
        }

        [HttpPost("Signal")]
        public async Task<IActionResult> MachineMonitoringAlert([FromBody] OwsTicketDetails model)
        {
            await _hubContext.Clients.All.SendAsync("ReceivedAlert", model);
            return Ok(new { success = true, data = model });
        }

    }
}
