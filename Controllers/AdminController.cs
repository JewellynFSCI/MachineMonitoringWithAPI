using MachineMonitoring.DataAccess.Repository;
using Microsoft.AspNetCore.Mvc;
using MachineMonitoring.DataAccess;
using MachineMonitoring.Models;
using Microsoft.AspNetCore.SignalR;
using MachineMonitoring.Models.ViewModel;
using static System.Net.Mime.MediaTypeNames;
using static System.Runtime.InteropServices.JavaScript.JSType;
using System.Linq.Expressions;
using System.Reflection.PortableExecutable;

namespace MachineMonitoring.Controllers
{
    public class AdminController : Controller
    {
        private readonly ILogger<AdminController> _logger;
        private readonly AdminRepo _adminrepo;
        private readonly IWebHostEnvironment _env;
        private readonly AdminVM _adminvm;


        public AdminController(ILogger<AdminController> logger, AdminRepo adminrepo, IWebHostEnvironment env, AdminVM adminvm)
        {
            _logger = logger;
            _adminrepo = adminrepo;
            _env = env;
            _adminvm = adminvm;
        }

        #region 'ListProductionMaps - View'
        public async Task<IActionResult> ListProductionMaps()
        {
            try
            {
                var _sessionEmployeeNUmber = HttpContext.Session.GetString("_EmployeeNumber");
                if (_sessionEmployeeNUmber == null)
                {
                    return RedirectToAction("Logout", "WinLoginAuth");
                }

                var viewModel = new AdminVM
                {
                    Plants = await _adminrepo.GetPLantNoList(),

                };
                return View(viewModel);
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error: " + ex.Message);
            }
        }
        #endregion

        #region 'GetProductionMaps'
        [HttpGet]
        public async Task<IActionResult> GetProductionMaps(ProductionMap? model)
        {
            try
            {
                var locationList = await _adminrepo.GetProductionMapList(model);
                return Json(new { locationList });
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error: " + ex.Message);
            }
        }
        #endregion

        #region 'UploadProdMap || Add new prod map'
        [HttpPost]
        public async Task<IActionResult> UploadProdMap(ProductionMap model, IFormFile ImgFile)
        {
            try
            {
                var _sessionEmployeeNUmber = HttpContext.Session.GetString("_EmployeeNumber");
                if (_sessionEmployeeNUmber == null)
                {
                    return RedirectToAction("Logout", "WinLoginAuth");
                }

                var allowedExtensions = new[] { ".jpg", ".png" };
                var extension = Path.GetExtension(ImgFile.FileName).ToLower();

                if (!allowedExtensions.Contains(extension))
                {
                    ModelState.AddModelError("", "Unsupported file type.");
                    return View(model);
                }

                if (!ModelState.IsValid)
                {
                    var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    return BadRequest(new { success = false, message = "Model validation failed.", errors });
                }

                var checkProdName = await _adminrepo.CheckProdName(model);
                if (checkProdName > 0)
                {
                    return BadRequest("Production Name already exists!");
                }

                var fileName = Path.GetFileNameWithoutExtension(ImgFile.FileName);
                var fileExtension = Path.GetExtension(ImgFile.FileName);
                var uniqueFileName = $"{fileName}_{Guid.NewGuid()}{fileExtension}";
                var savePath = Path.Combine(_env.WebRootPath, "img/productionmap", uniqueFileName);

                var _sessionEmployeeName = HttpContext.Session.GetString("_EmployeeName");
                model.CreatedBy = _sessionEmployeeName;
                var success = await _adminrepo.UploadProdMapRepo(model, uniqueFileName);
                if (success)
                {
                    using (var stream = new FileStream(savePath, FileMode.Create))
                    {
                        await ImgFile.CopyToAsync(stream);
                    }
                    return Ok("Saved successfully.");
                }
                else
                {
                    return BadRequest("Failed to insert record.");
                }

            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error." + ex.Message);
            }
        }
        #endregion

        #region 'DeleteMap'
        public async Task<IActionResult> DeleteMap(ProductionMap model)
        {
            try
            {
                var _sessionEmployeeNUmber = HttpContext.Session.GetString("_EmployeeNumber");
                if (_sessionEmployeeNUmber == null)
                {
                    return RedirectToAction("Logout", "WinLoginAuth");
                }

                var _sessionEmployeeName = HttpContext.Session.GetString("_EmployeeName");
                model.CreatedBy = _sessionEmployeeName;
                var delete = await _adminrepo.DeleteMapData(model);
                if (delete)
                {
                    return Ok("Deleted successfully.");
                }
                else
                {
                    return BadRequest("Failed to delete record.");
                }

            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error: " + ex.Message);
            }
        }
        #endregion

        #region 'UpdateProdMap || Update prod map and details'
        [HttpPost]
        public async Task<IActionResult> UpdateProdMap(ProductionMap model, IFormFile? ImgFile)
        {
            try
            {
                var _sessionEmployeeNUmber = HttpContext.Session.GetString("_EmployeeNumber");
                if (_sessionEmployeeNUmber == null)
                {
                    return RedirectToAction("Logout", "WinLoginAuth");
                }

                if (!ModelState.IsValid)
                {
                    var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    return BadRequest(new { success = false, message = "Model validation failed.", errors });
                }

                var checkProdName = await _adminrepo.CheckProdName(model);
                if (checkProdName > 0)
                {
                    return BadRequest("Production Name already exists!");
                }

                var _sessionEmployeeName = HttpContext.Session.GetString("_EmployeeName");
                model.CreatedBy = _sessionEmployeeName;

                #region 'image replacement if replaced by end-user'
                if (ImgFile != null)
                {
                    var allowedExtensions = new[] { ".jpg", ".png" };
                    var extension = Path.GetExtension(ImgFile.FileName).ToLower();
                    if (!allowedExtensions.Contains(extension))
                    {
                        ModelState.AddModelError("", "Unsupported file type.");
                        return View(model);
                    }
                    var fileName = Path.GetFileNameWithoutExtension(ImgFile.FileName);
                    var fileExtension = Path.GetExtension(ImgFile.FileName);
                    var uniqueFileName = $"{fileName}_{Guid.NewGuid()}{fileExtension}";
                    var savePath = Path.Combine(_env.WebRootPath, "img/productionmap", uniqueFileName);

                    // ❗ Get old image filename (you must pass it in the model or retrieve it from DB)
                    string oldImageFileName = model.ImgName;
                    var oldImagePath = Path.Combine(_env.WebRootPath, "img/productionmap", oldImageFileName);

                    var success = await _adminrepo.UploadProdMapReplacedImg(model, uniqueFileName);
                    if (success)
                    {
                        System.IO.File.Delete(oldImagePath);
                        using (var stream = new FileStream(savePath, FileMode.Create))
                        {
                            await ImgFile.CopyToAsync(stream);
                        }
                    }
                }
                #endregion

                //Update the other details'
                var UpdateProdMapDetails = await _adminrepo.UpdateProdMapDetails(model);
                return Ok("Saved successfully.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error: " + ex.Message);
            }
        }
        #endregion

        #region 'ListMachineLocation - View'
        public async Task<IActionResult> ListMachineLocation(ProductionMap? model)
        {
            try
            {
                var _sessionEmployeeNUmber = HttpContext.Session.GetString("_EmployeeNumber");
                if (_sessionEmployeeNUmber == null)
                {
                    return RedirectToAction("Logout", "WinLoginAuth");
                }

                var viewModel = new AdminVM
                {
                    Plants = await _adminrepo.GetPLantNoList(),
                    ProductionMaps = await _adminrepo.GetProductionMapList(model),
                    Machines = await _adminrepo.GetMachineCodes()
                };

                return View(viewModel);
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error: " + ex.Message);
            }
        }
        #endregion

        #region 'SaveMCCoordinates'
        [HttpPost]
        public async Task<IActionResult> SaveMcCoordinates(MachineLocation model)
        {
            try
            {
                var _sessionEmployeeNUmber = HttpContext.Session.GetString("_EmployeeNumber");
                if (_sessionEmployeeNUmber == null)
                {
                    return RedirectToAction("Logout", "WinLoginAuth");
                }

                if (model.MachineCode == null)
                {
                    return BadRequest("Please select machine!");
                }

                var _sessionEmployeeName = HttpContext.Session.GetString("_EmployeeName");
                model.CreatedBy = _sessionEmployeeName;
                var saved = await _adminrepo.SaveMcCoordinatesRepo(model);

                if (saved.Success)
                {
                    return Ok(saved);
                }
                else
                {
                    return Ok(saved);
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error." + ex.Message);
            }
        }
        #endregion

        #region 'GetMCLocation'
        [HttpGet]
        public async Task<IActionResult> GetMCLocation(MachineLocation? model)
        {
            var mclist = await _adminrepo.GetMCLocationRepo(model);
            return Json(new { mclist });
        }
        #endregion

        #region 'DeleteMCLocation'
        public async Task<IActionResult> DeleteMCLocation(MachineLocation model)
        {
            try
            {
                var _sessionEmployeeNUmber = HttpContext.Session.GetString("_EmployeeNumber");
                if (_sessionEmployeeNUmber == null)
                {
                    return RedirectToAction("Logout", "WinLoginAuth");
                }

                var delete = await _adminrepo.DeleteMCLocationRepo(model);
                if (delete)
                {
                    return Ok("Deleted successfully.");
                }
                else
                {
                    return BadRequest("Failed to delete record.");
                }

            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error: " + ex.Message);
            }
        }
        #endregion             

        #region 'Profile - View'
        public async Task<IActionResult> Profile()
        {
            try
            {
                var _sessionEmployeeNumber = HttpContext.Session.GetString("_EmployeeNumber");
                if (_sessionEmployeeNumber == null)
                {
                    return RedirectToAction("Logout", "WinLoginAuth");
                }

                var viewModel = new AdminVM
                {
                    Plants = await _adminrepo.GetPLantNoList()
                };

                return View(viewModel);
            }

            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error: " + ex.Message);
            }
        }
        #endregion

        #region 'ProductionMap - View'
        [HttpGet]
        public async Task<IActionResult> ProductionMap(ProductionMap? model)
        {
            try
            {
                var viewModel = new AdminVM
                {
                    Plants = await _adminrepo.GetPLantNoList(),
                    ProductionMaps = await _adminrepo.GetProductionMapList(model)
                };

                return View(viewModel);
            }

            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error: " + ex.Message);
            }
        }
        #endregion


        [HttpPost]
        public async Task<IActionResult> ReceivedSignal (OwsTicketDetails model)
        {
            //Check if Machine Status
            var MCStatus = await _adminrepo.GetMCStatus(model);
            if (MCStatus == "NG")
            {
                //send message to OWS
                return Ok(new { success = false });
            }

            return Ok(new { success = true });

            
        }

    }
}
