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
using MachineMonitoring.Models.DTOs;
using Mysqlx;

namespace MachineMonitoring.Controllers
{
    public class AdminController : Controller
    {

        private readonly AdminRepo _adminrepo;
        private readonly IWebHostEnvironment _env;


        public AdminController(AdminRepo adminrepo, IWebHostEnvironment env)
        {
            _adminrepo = adminrepo;
            _env = env;
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
        public async Task<IActionResult> GetProductionMaps(int PlantNo)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var locationList = await _adminrepo.GetProductionMapList(PlantNo);
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
                    return BadRequest("File format must be .jpeg and .png only.");
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
        public async Task<IActionResult> DeleteMap(int ProductionMapId, string ImgName)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var _sessionEmployeeNumber = HttpContext.Session.GetString("_EmployeeNumber");
                var _sessionEmployeeName = HttpContext.Session.GetString("_EmployeeName");
                if (_sessionEmployeeNumber == null || _sessionEmployeeName == null)
                {
                    return BadRequest("Please reload page.");
                }

                var delete = await _adminrepo.DeleteMapData(ProductionMapId, _sessionEmployeeName);
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
                return StatusCode(500, ex.Message);
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
                        return BadRequest("File format must be .jpeg and .png only.");
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
        public async Task<IActionResult> ListMachineLocation(int PlantNo)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var _sessionEmployeeNUmber = HttpContext.Session.GetString("_EmployeeNumber");
                if (_sessionEmployeeNUmber == null)
                {
                    return RedirectToAction("Logout", "WinLoginAuth");
                }

                var viewModel = new AdminVM
                {
                    Plants = await _adminrepo.GetPLantNoList(),
                    ProductionMaps = await _adminrepo.GetProductionMapList(PlantNo),
                };

                return View(viewModel);
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error: " + ex.Message);
            }
        }
        #endregion

        #region 'GetMachineCodesByPlant'
        [HttpGet]
        public async Task<IActionResult> GetMachineCodesByPlant(int plantNo)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var allMachines = await _adminrepo.GetMachineCodes(); // call your existing API function
                var filteredMachines = allMachines
                    .Where(mc => mc.plantNo == plantNo)
                    .ToList();

                return Json(new { success = true, machines = filteredMachines });
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Error fetching machine codes: " + ex.Message);
            }
        }
        #endregion

        #region 'GetProcessCategory'
        public async Task<IActionResult> GetProcessCategory()
        {
            try
            {
                var processcateg = await _adminrepo.GetProcessCateg(); // call your existing API function
                return Json(new { success = true, category = processcateg });
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Error fetching category: " + ex.Message);
            }
        }
        #endregion

        #region 'SaveMCCoordinates'
        [HttpPost]
        public async Task<IActionResult> SaveMcCoordinates(MachineLocation model)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

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
                return Ok(saved);
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error." + ex.Message);
            }
        }
        #endregion

        #region 'GetMCLocation'
        [HttpGet]
        public async Task<IActionResult> GetMCLocation(int PlantNo, int ProductionMapId)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var getmclist = await _adminrepo.GetMCLocationRepo(PlantNo, ProductionMapId);
            var mclist = getmclist.OrderBy(x => x.MachineCode).ToList();
            return Json(new { mclist });
        }
        #endregion

        #region 'DeleteMCLocation'
        public async Task<IActionResult> DeleteMCLocation(int machineLocationId)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var _sessionEmployeeNUmber = HttpContext.Session.GetString("_EmployeeNumber");
                if (_sessionEmployeeNUmber == null)
                {
                    return RedirectToAction("Logout", "WinLoginAuth");
                }

                var delete = await _adminrepo.DeleteMCLocationRepo(machineLocationId);
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
        public async Task<IActionResult> ProductionMap(int PlantNo)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var viewModel = new AdminVM
                {
                    Plants = await _adminrepo.GetPLantNoList(),
                    ProductionMaps = await _adminrepo.GetProductionMapList(PlantNo),
                    mcStatusColor = await _adminrepo.GetMCStatusColorsRepo()
                };
                return View(viewModel);
            }

            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error: " + ex.Message);
            }
        }
        #endregion

        #region 'GetMachineStatus'
        [HttpGet]
        public async Task<IActionResult> GetMachineStatus(int PlantNo, int ProductionMapId)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var mclist = await _adminrepo.GetMachineStatusRepo(PlantNo, ProductionMapId);
            return Json(new { mclist });
        }
        #endregion

        #region 'StatusColor - View'
        [HttpGet]
        public async Task<IActionResult> StatusColor()
        {
            var _sessionEmployeeNUmber = HttpContext.Session.GetString("_EmployeeNumber");
            if (_sessionEmployeeNUmber == null)
            {
                return RedirectToAction("Logout", "WinLoginAuth");
            }

            var viewModel = new AdminVM
            {
                mcStatusColor = await _adminrepo.GetMCStatusColorsRepo()
            };
            return View(viewModel);

        }
        #endregion

        #region 'SaveMachineStatusColor'
        [HttpPost]
        public async Task<IActionResult> SaveMachineStatusColor(int status_id, string status_color, string hex_value)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var _sessionEmployeeName = HttpContext.Session.GetString("_EmployeeName");
                if (_sessionEmployeeName == null)
                {
                    return RedirectToAction("Logout", "WinLoginAuth");
                }

                var saved = await _adminrepo.SaveMachineStatusColorRepo(status_id, status_color, hex_value, _sessionEmployeeName);
                if (!saved.Success)
                {
                    return BadRequest(new { success = false, message = saved.Message });
                }
                return Ok(saved);
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error." + ex.Message);
            }
        }
        #endregion

        #region 'RefreshStatusColorTable'
        public async Task<IActionResult> RefreshStatusColorTable()
        {
            var model = new AdminVM
            {
                mcStatusColor = await _adminrepo.GetMCStatusColorsRepo()
            };
            return PartialView("_PartialStatusColorTable", model);
        }
        #endregion


        #region 'FrontPage v2 - View'
        [HttpGet]
        public async Task<IActionResult> FrontPagev2(int PlantNo)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var viewModel = new AdminVM
                {
                    Plants = await _adminrepo.GetPLantNoList(),
                    ProductionMaps = await _adminrepo.GetProductionMapList(PlantNo),
                    mcStatusColor = await _adminrepo.GetMCStatusColorsRepo()
                };
                return View(viewModel);
            }

            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error: " + ex.Message);
            }
        }
        #endregion

    }
}
